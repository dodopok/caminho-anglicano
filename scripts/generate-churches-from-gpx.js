/**
 * Script para gerar SQLs de igrejas a partir de arquivo GPX
 * 
 * Uso:
 * 1. npm install xml2js dotenv
 * 2. Adicione GOOGLE_MAPS_API_KEY no .env
 * 3. node scripts/generate-churches-from-gpx.js caminho/para/arquivo.gpx
 * 
 * O script irá:
 * - Ler o arquivo GPX
 * - Consultar Google Places API para cada igreja
 * - Gerar SQLs de INSERT formatados
 * - Salvar em output/churches-import.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xml2js from 'xml2js';
import dotenv from 'dotenv';

// ES modules não tem __dirname, precisamos criar
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config();

const GOOGLE_API_KEY = process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_MAPS_API_KEY não encontrada no .env');
  process.exit(1);
}

// Mapeamento de jurisdições
const JURISDICTION_MAP = {
  'IAB': 'Igreja Anglicana do Brasil',
  'IEAB': 'Igreja Episcopal Anglicana do Brasil',
  'IECB': 'Igreja Episcopal Carismática do Brasil',
  'IARB': 'Igreja Anglicana Reformada do Brasil',
  'REB': 'Rede Evangélica Brasileira',
  'TAC': 'TAC',
  'ICEB': 'ICEB',
  'IEUB': 'IEUB',
  'Independente': 'Independente'
};

// Delay entre requisições (para evitar rate limit)
const DELAY_MS = 500;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extrai a jurisdição do nome da igreja
 */
function extractJurisdiction(name) {
  const match = name.match(/\s-\s([A-Z]+|Independente)$/);
  if (match) {
    const code = match[1];
    return {
      code,
      cleanName: name.replace(/\s-\s[A-Z]+$/, '').trim()
    };
  }
  return {
    code: null,
    cleanName: name
  };
}

/**
 * Busca detalhes do lugar na Google Places API
 */
async function getPlaceDetails(name, lat, lng) {
  try {
    // 1. Nearby Search para encontrar o place_id
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&keyword=${encodeURIComponent(name)}&key=${GOOGLE_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      console.log(`   ⚠️ - ${name} - Lugar não encontrado na API do Google`);
      return null;
    }

    const placeId = searchData.results[0].place_id;
    
    await delay(DELAY_MS); // Delay entre requisições

    // 2. Place Details para obter informações completas
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,website,opening_hours,formatted_phone_number,editorial_summary&language=pt-BR&key=${GOOGLE_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK') {
      console.log(`   ⚠️  Detalhes não encontrados`);
      return null;
    }

    return detailsData.result;
  } catch (error) {
    console.error(`   ❌ Erro ao buscar detalhes:`, error.message);
    return null;
  }
}

/**
 * Extrai Instagram de texto ou descrição
 */
function extractInstagram(text) {
  if (!text) return null;
  
  const match = text.match(/(?:instagram\.com\/|@)([a-zA-Z0-9._]+)/i);
  return match ? `@${match[1].replace('@', '')}` : null;
}

/**
 * Extrai horários de culto do Google Places
 */
function extractSchedules(openingHours) {
  if (!openingHours || !openingHours.weekday_text) {
    return [];
  }

  // Mapeamento de dias em português para capitalizado
  const dayMap = {
    'domingo': 'Domingo',
    'segunda': 'Segunda-feira',
    'terça': 'Terça-feira',
    'quarta': 'Quarta-feira',
    'quinta': 'Quinta-feira',
    'sexta': 'Sexta-feira',
    'sábado': 'Sábado'
  };

  const schedules = [];

  for (const dayText of openingHours.weekday_text) {
    // Extrai o dia e horário
    // Formato: "domingo: 10:00 – 12:00" ou "segunda-feira: Fechado"
    const dayMatch = dayText.match(/^([^:]+):\s*(.+)$/);
    if (!dayMatch) continue;

    const dayName = dayMatch[1].toLowerCase().trim();
    const hours = dayMatch[2].trim();

    // Ignora dias fechados
    if (hours.toLowerCase().includes('fechado') || hours.toLowerCase().includes('closed')) {
      continue;
    }

    // Extrai primeiro horário (geralmente é o de abertura/início)
    const timeMatch = hours.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      // Encontra o nome do dia no mapa
      let formattedDay = null;
      for (const [key, value] of Object.entries(dayMap)) {
        if (dayName.includes(key)) {
          formattedDay = value;
          break;
        }
      }

      if (formattedDay) {
        schedules.push({
          day: formattedDay,
          time: timeMatch[1]
        });
      }
    }
  }

  return schedules;
}

/**
 * Formata endereço do Google para componentes
 */
function parseAddress(formattedAddress) {
  const parts = formattedAddress.split(',').map(p => p.trim());
  
  // Último item geralmente é "Brasil"
  // Penúltimo é o CEP
  // Antes disso: Cidade - Estado
  
  let postalCode = '';
  let state = '';
  let city = '';
  let address = '';

  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 2]; // Ex: "Recife - PE, 50030-230"
    
    const cepMatch = lastPart.match(/(\d{5}-\d{3})/);
    if (cepMatch) {
      postalCode = cepMatch[1];
    }

    const cityStateMatch = lastPart.match(/^([^-]+)\s*-\s*([A-Z]{2})/);
    if (cityStateMatch) {
      city = cityStateMatch[1].trim();
      state = cityStateMatch[2].trim();
    }

    address = parts.slice(0, -2).join(', ');
  }

  return {
    address: address || formattedAddress,
    city: city || 'Cidade',
    state: state || 'UF',
    postalCode: postalCode || '00000-000'
  };
}

/**
 * Gera SQL INSERT para uma igreja
 */
function generateSQL(church) {
  const jurisdiction = church.jurisdictionCode || 'NULL';
  const name = church.name.replace(/'/g, "''");
  const address = church.address.replace(/'/g, "''");
  const city = church.city.replace(/'/g, "''");
  const state = church.state.replace(/'/g, "''");
  const postalCode = church.postalCode.replace(/'/g, "''");
  const description = church.description ? church.description.replace(/'/g, "''") : '';
  const email = church.email || 'contato@exemplo.com';
  
  const schedulesJson = church.schedules.length > 0 
    ? JSON.stringify(church.schedules) 
    : '[]';
  
  const socialMedia = {
    ...(church.website && { website: church.website }),
    ...(church.instagram && { instagram: church.instagram }),
  };
  const socialMediaJson = JSON.stringify(socialMedia);

  const jurisdictionClause = jurisdiction === 'NULL' 
    ? 'NULL -- PREENCHER MANUALMENTE'
    : `(SELECT id FROM jurisdictions WHERE slug = '${jurisdiction}')`;

  return `
  -- ${name}
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    '${name}',
    ${jurisdictionClause},
    '${address}',
    '${city}', '${state}', '${postalCode}',
    ${church.lat}, ${church.lng},
    '${schedulesJson}'::jsonb,
    ${description ? `'${description}'` : 'NULL'},
    ARRAY[]::TEXT[],
    '${email}',
    '${socialMediaJson}'::jsonb
  );`;
}

/**
 * Processa o arquivo GPX
 */
async function processGPX(gpxFilePath) {
  console.log('📖 Lendo arquivo GPX...');
  
  const gpxContent = fs.readFileSync(gpxFilePath, 'utf8');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(gpxContent);

  const waypoints = result.gpx.wpt || [];
  console.log(`✅ Encontrados ${waypoints.length} waypoints\n`);

  const churches = [];
  let processed = 0;
  let withDetails = 0;

  for (const wpt of waypoints) {
    processed++;
    const lat = parseFloat(wpt.$.lat);
    const lng = parseFloat(wpt.$.lon);
    const fullName = wpt.name[0];
    
    console.log(`[${processed}/${waypoints.length}] Processando: ${fullName}`);

    const { code, cleanName } = extractJurisdiction(fullName);
    
    // Busca detalhes no Google
    const placeDetails = await getPlaceDetails(cleanName, lat, lng);
    
    let churchData = {
      name: cleanName,
      jurisdictionCode: code,
      lat,
      lng,
      address: '',
      city: '',
      state: '',
      postalCode: '',
      schedules: [],
      description: '',
      website: null,
      instagram: null,
      email: null
    };

    if (placeDetails) {
      withDetails++;
      console.log(`   ✓ Detalhes encontrados`);

      const addressParts = parseAddress(placeDetails.formatted_address);
      
      churchData = {
        ...churchData,
        ...addressParts,
        description: placeDetails.editorial_summary?.overview || '',
        website: placeDetails.website || null,
        schedules: extractSchedules(placeDetails.opening_hours)
      };
    }

    // Verifica se tem Instagram na descrição do GPX
    const description = wpt.extensions?.[0]?.['ogr:description']?.[0];
    if (description) {
      const instagram = extractInstagram(description);
      if (instagram) {
        churchData.instagram = instagram;
        console.log(`   ✓ Instagram: ${instagram}`);
      }
    }

    churches.push(churchData);
    
    // Delay entre igrejas
    await delay(DELAY_MS);
  }

  console.log(`\n✅ Processamento concluído!`);
  console.log(`   Total: ${processed} igrejas`);
  console.log(`   Com detalhes: ${withDetails} (${Math.round(withDetails/processed*100)}%)`);
  console.log(`   Sem detalhes: ${processed - withDetails}`);

  return churches;
}

/**
 * Gera arquivo SQL
 */
function generateSQLFile(churches, outputPath) {
  const header = `-- SQL gerado automaticamente a partir de arquivo GPX
-- Data: ${new Date().toISOString()}
-- Total de igrejas: ${churches.length}

DO $$
BEGIN
`;

  const footer = `
END $$;

-- Verificação
SELECT 
  j.slug as jurisdicao,
  COUNT(*) as total
FROM churches c
LEFT JOIN jurisdictions j ON c.jurisdiction_id = j.id
GROUP BY j.slug
ORDER BY j.slug;
`;

  const sqls = churches.map(generateSQL).join('\n');
  const fullSQL = header + sqls + footer;

  fs.writeFileSync(outputPath, fullSQL, 'utf8');
  console.log(`\n📝 Arquivo SQL gerado: ${outputPath}`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Uso: node generate-churches-from-gpx.js <caminho-para-arquivo.gpx>');
    process.exit(1);
  }

  const gpxFilePath = args[0];
  
  if (!fs.existsSync(gpxFilePath)) {
    console.error(`❌ Arquivo não encontrado: ${gpxFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Iniciando processamento...\n');

  try {
    const churches = await processGPX(gpxFilePath);
    
    // Cria diretório output se não existir
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'churches-import.sql');
    generateSQLFile(churches, outputPath);

    console.log('\n✅ Processamento concluído com sucesso!');
    console.log('⚠️  Revise o arquivo SQL antes de executar no banco de dados');
    console.log('⚠️  Preencha manualmente as jurisdições NULL e emails genéricos');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
