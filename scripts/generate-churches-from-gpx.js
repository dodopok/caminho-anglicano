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
import readline from 'readline';

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
  'REB': 'Rede Episcopal Brasileira'
};

// Delay entre requisições (para evitar rate limit)
const DELAY_MS = 500;

// Cores disponíveis para jurisdições
const AVAILABLE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pergunta ao usuário pela jurisdição
 */
function askForJurisdiction(churchName) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n❓ Jurisdição não identificada para: "${churchName}"`);
    console.log(`   Jurisdições conhecidas: ${Object.keys(JURISDICTION_MAP).join(', ')}`);
    rl.question('   Digite a sigla da jurisdição (ou ENTER para pular): ', (answer) => {
      rl.close();
      const code = answer.trim().toUpperCase();
      resolve(code || null);
    });
  });
}

/**
 * Extrai a jurisdição do nome da igreja
 */
function extractJurisdiction(name) {
  // Aceita variações: " - CODE", "- CODE", " -CODE"
  const match = name.match(/\s*-\s*([A-Z]+|Independente)$/);
  if (match) {
    const code = match[1];
    return {
      code,
      cleanName: name.replace(/\s*-\s*[A-Z]+$/i, '').trim()
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
 * Busca endereço pela latitude e longitude (Reverse Geocoding)
 */
async function getAddressFromCoordinates(lat, lng) {
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`   ⚠️  Não foi possível obter endereço das coordenadas`);
      return null;
    }

    // Pega o primeiro resultado (geralmente o mais específico)
    const formattedAddress = data.results[0].formatted_address;
    return formattedAddress;
  } catch (error) {
    console.error(`   ❌ Erro ao buscar endereço por coordenadas:`, error.message);
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
  if (!formattedAddress) {
    return {
      address: '',
      city: 'Cidade',
      state: 'UF',
      postalCode: '00000-000'
    };
  }

  const parts = formattedAddress.split(',').map(p => p.trim());
  
  let postalCode = '';
  let state = '';
  let city = '';
  let address = '';

  // Formato comum do Google: "Rua X, 123, Bairro, Cidade - UF, CEP, Brasil"
  
  // Procura CEP em qualquer parte
  for (const part of parts) {
    const cepMatch = part.match(/(\d{5}-?\d{3})/);
    if (cepMatch) {
      postalCode = cepMatch[1].includes('-') ? cepMatch[1] : cepMatch[1].replace(/(\d{5})(\d{3})/, '$1-$2');
      break;
    }
  }

  // Procura por "Cidade - UF" em qualquer parte (prioriza as últimas partes)
  let cityStateFound = false;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const cityStateMatch = part.match(/^(.+?)\s*-\s*([A-Z]{2})$/);
    
    if (cityStateMatch) {
      city = cityStateMatch[1].trim();
      state = cityStateMatch[2].trim();
      cityStateFound = true;
      
      // Endereço são todas as partes antes desta (exceto a que tem Cidade - UF e CEP/Brasil)
      const addressParts = [];
      for (let j = 0; j < i; j++) {
        const addressPart = parts[j];
        // Pula CEP e Brasil
        if (!/\d{5}-?\d{3}/.test(addressPart) && addressPart.toLowerCase() !== 'brasil') {
          addressParts.push(addressPart);
        }
      }
      address = addressParts.join(', ');
      break;
    }
  }

  // Se não encontrou no formato "Cidade - UF", tenta outras estratégias
  if (!cityStateFound && parts.length >= 3) {
    // Penúltima ou antepenúltima parte pode ser a cidade
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      
      // Pula se for "Brasil" ou CEP
      if (part.toLowerCase() === 'brasil' || /\d{5}-?\d{3}/.test(part)) {
        continue;
      }
      
      // Se tiver estado (2 letras maiúsculas) extraído
      const stateMatch = part.match(/\b([A-Z]{2})\b/);
      if (stateMatch && !state) {
        state = stateMatch[1];
      }
      
      // Se não tem hífen e não tem números, provavelmente é a cidade
      if (!city && !/\d/.test(part) && !part.includes('-')) {
        city = part.trim();
      }
      
      if (city && state) {
        // Endereço são todas as partes antes da cidade
        const cityIndex = parts.indexOf(part);
        address = parts.slice(0, cityIndex).join(', ');
        break;
      }
    }
  }

  // Limpa endereço de CEP e Brasil se tiver
  address = address
    .replace(/,?\s*\d{5}-?\d{3}/, '')
    .replace(/,?\s*Brasil\s*,?/i, '')
    .trim();

  return {
    address: address || formattedAddress,
    city: city || 'Cidade',
    state: state || 'UF',
    postalCode: postalCode || '00000-000'
  };
}

/**
 * Gera SQL para criar uma jurisdição
 */
function generateJurisdictionSQL(slug, displayOrder) {
  const randomColor = AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)];
  
  return `
-- Criando jurisdição: ${slug}
INSERT INTO jurisdictions (slug, name, full_name, color, description, display_order)
VALUES (
  '${slug}',
  '${slug}',
  '${slug}',
  '${randomColor}',
  '',
  ${displayOrder}
)
ON CONFLICT (slug) DO NOTHING;
`;
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
  const email = church.email || '';
  
  const schedulesJson = church.schedules.length > 0 
    ? JSON.stringify(church.schedules) 
    : '[]';
  
  const socialMedia = {
    ...(church.website && { website: church.website }),
    ...(church.instagram && { instagram: church.instagram }),
  };
  const socialMediaJson = JSON.stringify(socialMedia);

  const jurisdictionClause = jurisdiction === 'NULL' 
    ? 'NULL'
    : `(SELECT id FROM jurisdictions WHERE slug = '${jurisdiction}')`;

  const emailValue = email ? `'${email}'` : "''";

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
    ${emailValue},
    '${socialMediaJson}'::jsonb
  );`;
}

/**
 * Processa o arquivo GPX
 */
async function processGPX(gpxFilePath, outputDir) {
  console.log('📖 Lendo arquivo GPX...');
  
  const gpxContent = fs.readFileSync(gpxFilePath, 'utf8');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(gpxContent);

  const waypoints = result.gpx.wpt || [];
  console.log(`✅ Encontrados ${waypoints.length} waypoints\n`);

  // Primeiro, identifica todas as jurisdições únicas
  console.log('🔍 Identificando jurisdições...');
  const foundJurisdictions = new Set();
  const knownJurisdictions = new Set(Object.keys(JURISDICTION_MAP));
  
  for (const wpt of waypoints) {
    const fullName = wpt.name[0];
    const { code } = extractJurisdiction(fullName);
    if (code) {
      foundJurisdictions.add(code);
    }
  }
  
  // Identifica jurisdições novas (não conhecidas)
  const newJurisdictions = Array.from(foundJurisdictions).filter(j => !knownJurisdictions.has(j));
  
  if (newJurisdictions.length > 0) {
    console.log(`📝 Encontradas ${newJurisdictions.length} jurisdições novas: ${newJurisdictions.join(', ')}`);
  } else {
    console.log(`✅ Todas as jurisdições já são conhecidas`);
  }
  console.log('');

  // Cria arquivos de saída
  const withDetailsPath = path.join(outputDir, 'churches-with-details.sql');
  const withoutDetailsPath = path.join(outputDir, 'churches-without-details.sql');
  
  // Limpa arquivos existentes (zera os arquivos)
  console.log('🗑️  Limpando arquivos SQL anteriores...');
  if (fs.existsSync(withDetailsPath)) {
    fs.unlinkSync(withDetailsPath);
  }
  if (fs.existsSync(withoutDetailsPath)) {
    fs.unlinkSync(withoutDetailsPath);
  }
  console.log('✅ Arquivos SQL zerados\n');
  
  // Inicializa arquivos com cabeçalho
  let header = `-- SQL gerado automaticamente a partir de arquivo GPX
-- Data: ${new Date().toISOString()}

`;

  // Adiciona SQLs para criar jurisdições novas
  if (newJurisdictions.length > 0) {
    header += `\n-- ==========================================\n`;
    header += `-- CRIANDO JURISDIÇÕES NOVAS\n`;
    header += `-- ==========================================\n`;
    
    // Pega o último display_order (assumindo que começa em 1 e as conhecidas são 9)
    let displayOrder = Object.keys(JURISDICTION_MAP).length + 1;
    
    for (const slug of newJurisdictions) {
      header += generateJurisdictionSQL(slug, displayOrder);
      displayOrder++;
    }
    
    header += `\n-- ==========================================\n`;
    header += `-- INSERINDO IGREJAS\n`;
    header += `-- ==========================================\n\n`;
  }

  fs.writeFileSync(withDetailsPath, header, 'utf8');
  fs.writeFileSync(withoutDetailsPath, header, 'utf8');

  let processed = 0;
  let withDetails = 0;
  let withoutDetails = 0;
  const notFoundWaypoints = []; // Para salvar waypoints não encontrados

  for (const wpt of waypoints) {
    processed++;
    const lat = parseFloat(wpt.$.lat);
    const lng = parseFloat(wpt.$.lon);
    const fullName = wpt.name[0];
    
    console.log(`[${processed}/${waypoints.length}] Processando: ${fullName}`);

    let { code, cleanName } = extractJurisdiction(fullName);
    
    // Se não encontrou jurisdição, pergunta ao usuário
    if (!code) {
      code = await askForJurisdiction(fullName);
      if (code) {
        console.log(`   ✓ Jurisdição definida: ${code}`);
      }
    }
    
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

    let hasDetails = false;

    // Verifica se tem endereço manual no GPX (tag <address>)
    const manualAddress = wpt.address?.[0];
    
    if (manualAddress) {
      console.log(`   ℹ️  Endereço manual encontrado no GPX`);
      hasDetails = true;
      
      const addressParts = parseAddress(manualAddress);
      churchData = {
        ...churchData,
        ...addressParts
      };
    } else if (placeDetails) {
      hasDetails = true;
      console.log(`   ✓ Detalhes encontrados no Google`);

      const addressParts = parseAddress(placeDetails.formatted_address);
      
      let website = placeDetails.website || null;
      let instagram = churchData.instagram;

      // Se o website for Instagram, move para campo instagram
      if (website && (website.includes('instagram.com') || website.includes('instagr.am'))) {
        instagram = extractInstagram(website) || website;
        website = null;
        console.log(`   ✓ Website é Instagram: ${instagram}`);
      }
      
      churchData = {
        ...churchData,
        ...addressParts,
        description: placeDetails.editorial_summary?.overview || '',
        website,
        instagram,
        schedules: extractSchedules(placeDetails.opening_hours)
      };
    } else {
      // Se não tem endereço manual nem Google Places, tenta geocoding reverso
      console.log(`   ⚠️  Sem detalhes do Google - tentando obter endereço por coordenadas...`);
      const geocodedAddress = await getAddressFromCoordinates(lat, lng);
      
      if (geocodedAddress) {
        console.log(`   ✓ Endereço obtido por geocoding reverso`);
        hasDetails = true;
        const addressParts = parseAddress(geocodedAddress);
        churchData = {
          ...churchData,
          ...addressParts
        };
      } else {
        console.log(`   ⚠️  Sem detalhes - salvando apenas coordenadas`);
      }
    }

    // Verifica se tem Instagram na descrição do GPX
    const description = wpt.extensions?.[0]?.['ogr:description']?.[0];
    if (description) {
      const instagram = extractInstagram(description);
      if (instagram && !churchData.instagram) {
        churchData.instagram = instagram;
        console.log(`   ✓ Instagram: ${instagram}`);
      }
    }

    // Se não tem jurisdição, considera como "sem detalhes"
    if (!code) {
      hasDetails = false;
      console.log(`   ⚠️  Sem jurisdição identificada`);
    }

    // Conta separadamente
    if (hasDetails) {
      withDetails++;
    } else {
      withoutDetails++;
      // Salva waypoint para GPX separado
      notFoundWaypoints.push(wpt);
    }

    // Gera SQL e salva imediatamente no arquivo apropriado
    const sql = generateSQL(churchData);
    const targetFile = hasDetails ? withDetailsPath : withoutDetailsPath;
    fs.appendFileSync(targetFile, sql + '\n', 'utf8');
    console.log(`   💾 Salvo em: ${hasDetails ? 'with-details' : 'without-details'}`);
    
    // Delay entre igrejas
    await delay(DELAY_MS);
  }

  // Adiciona footer nos dois arquivos
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

  fs.appendFileSync(withDetailsPath, footer, 'utf8');
  fs.appendFileSync(withoutDetailsPath, footer, 'utf8');

  // Salva GPX com igrejas não encontradas
  if (notFoundWaypoints.length > 0) {
    const notFoundGpxPath = path.join(outputDir, 'churches-not-found.gpx');
    const gpxBuilder = new xml2js.Builder();
    const notFoundGpx = {
      gpx: {
        $: result.gpx.$, // Mantém atributos do GPX original
        wpt: notFoundWaypoints
      }
    };
    const gpxXml = gpxBuilder.buildObject(notFoundGpx);
    fs.writeFileSync(notFoundGpxPath, gpxXml, 'utf8');
    console.log(`\n📍 GPX com igrejas não encontradas: ${notFoundGpxPath}`);
  }

  console.log(`\n✅ Processamento concluído!`);
  console.log(`   Total: ${processed} igrejas`);
  console.log(`   Com detalhes: ${withDetails} (${Math.round(withDetails/processed*100)}%)`);
  console.log(`   Sem detalhes: ${withoutDetails} (${Math.round(withoutDetails/processed*100)}%)`);
  console.log(`\n📁 Arquivos gerados:`);
  console.log(`   ✅ ${withDetailsPath}`);
  console.log(`   ⚠️  ${withoutDetailsPath}`);
  if (notFoundWaypoints.length > 0) {
    console.log(`   📍 ${path.join(outputDir, 'churches-not-found.gpx')} (${notFoundWaypoints.length} igrejas)`);
  }

  return { withDetails, withoutDetails, total: processed };
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
    // Cria diretório output se não existir
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Processa GPX e salva em tempo real
    const stats = await processGPX(gpxFilePath, outputDir);

    console.log('\n✅ Processamento concluído com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   Total processado: ${stats.total} igrejas`);
    console.log(`   ✅ Com detalhes completos: ${stats.withDetails}`);
    console.log(`   ⚠️  Apenas dados básicos: ${stats.withoutDetails}`);
    console.log('\n⚠️  Próximos passos:');
    console.log('   1. Revise os arquivos SQL gerados');
    console.log('   2. Preencha manualmente as jurisdições NULL');
    console.log('   3. Substitua emails genéricos');
    console.log('   4. Complete dados das igrejas sem detalhes');
    console.log('   5. Execute os SQLs no Supabase');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
