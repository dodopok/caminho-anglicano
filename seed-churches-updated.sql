-- SQL para inserir 10 igrejas de teste
-- Execute este script no Supabase SQL Editor DEPOIS de executar o supabase-schema.sql

-- NOTA: Este script usa os IDs das jurisdições criadas automaticamente
-- Primeiro, vamos criar variáveis para armazenar os IDs

DO $$
DECLARE
  iab_id UUID;
  ieab_id UUID;
  iecb_id UUID;
  iarb_id UUID;
  reb_id UUID;
BEGIN
  -- Buscar os IDs das jurisdições
  SELECT id INTO iab_id FROM jurisdictions WHERE slug = 'IAB';
  SELECT id INTO ieab_id FROM jurisdictions WHERE slug = 'IEAB';
  SELECT id INTO iecb_id FROM jurisdictions WHERE slug = 'IECB';
  SELECT id INTO iarb_id FROM jurisdictions WHERE slug = 'IARB';
  SELECT id INTO reb_id FROM jurisdictions WHERE slug = 'REB';

  -- 1. Igreja Anglicana São Paulo - IAB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Catedral Anglicana de São Paulo',
    iab_id,
    'Av. Paulista, 1578 - Bela Vista',
    'São Paulo', 'SP', '01310-200',
    -23.561684, -46.656139,
    '[{"day": "Domingo", "time": "10h00"}, {"day": "Domingo", "time": "18h00"}, {"day": "Quarta-feira", "time": "19h30"}]'::jsonb,
    'Catedral histórica no coração de São Paulo, com mais de 50 anos de história.',
    ARRAY['Rev. João Silva', 'Rev. Maria Santos'],
    'contato@catedralsp.com.br',
    '{"website": "https://catedralsp.com.br", "instagram": "@catedralsp", "youtube": "@catedralsp"}'::jsonb
  );

  -- 2. Igreja Episcopal do Rio de Janeiro - IEAB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Igreja Episcopal Cristo Redentor',
    ieab_id,
    'Rua Visconde de Pirajá, 550 - Ipanema',
    'Rio de Janeiro', 'RJ', '22410-002',
    -22.984340, -43.198489,
    '[{"day": "Domingo", "time": "9h00"}, {"day": "Domingo", "time": "17h00"}]'::jsonb,
    'Comunidade acolhedora em Ipanema, focada em adoração litúrgica e ação social.',
    ARRAY['Rev. Carlos Mendes'],
    'contato@episcopalrio.org.br',
    '{"website": "https://episcopalrio.org.br", "instagram": "@episcopalrio"}'::jsonb
  );

  -- 3. Igreja Episcopal Carismática de Brasília - IECB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Igreja Episcopal Carismática de Brasília',
    iecb_id,
    'SQS 308, Bloco A - Asa Sul',
    'Brasília', 'DF', '70355-010',
    -15.816590, -47.903812,
    '[{"day": "Domingo", "time": "10h00"}, {"day": "Quinta-feira", "time": "20h00"}]'::jsonb,
    'Comunidade vibrante com ênfase em adoração contemporânea e manifestações do Espírito Santo.',
    ARRAY['Pb. Ana Paula Costa', 'Pb. Ricardo Oliveira'],
    'contato@iecbrasilia.com.br',
    '{"instagram": "@iecbrasilia", "youtube": "@IECBrasilia", "spotify": "IEC Brasília"}'::jsonb
  );

  -- 4. Igreja Anglicana Reformada de Belo Horizonte - IARB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Igreja Anglicana Reformada Graça e Paz',
    iarb_id,
    'Rua Pernambuco, 1000 - Savassi',
    'Belo Horizonte', 'MG', '30130-151',
    -19.934567, -43.934123,
    '[{"day": "Domingo", "time": "9h30"}, {"day": "Domingo", "time": "19h00"}]'::jsonb,
    'Igreja reformada com forte ênfase em ensino bíblico expositivo e doutrina reformada.',
    ARRAY['Rev. Pedro Almeida'],
    'contato@iarbh.org',
    '{"website": "https://iarbh.org", "instagram": "@iarbh"}'::jsonb
  );

  -- 5. Comunidade Anglicana de Curitiba - REB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Comunidade Anglicana Curitiba',
    reb_id,
    'Rua XV de Novembro, 500 - Centro',
    'Curitiba', 'PR', '80020-310',
    -25.437238, -49.269123,
    '[{"day": "Domingo", "time": "10h30"}]'::jsonb,
    'Comunidade emergente focada em alcançar jovens e adultos urbanos.',
    ARRAY['Rev. Lucas Ferreira'],
    'contato@anglicanactba.com',
    '{"instagram": "@anglicanactba", "youtube": "@AnglicanaCuritiba"}'::jsonb
  );

  -- 6. Igreja Anglicana de Porto Alegre - IAB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Igreja Anglicana São Pedro',
    iab_id,
    'Av. Borges de Medeiros, 1501 - Praia de Belas',
    'Porto Alegre', 'RS', '90110-150',
    -30.043189, -51.226712,
    '[{"day": "Domingo", "time": "9h00"}, {"day": "Domingo", "time": "18h30"}]'::jsonb,
    'Igreja tradicional anglicana com liturgia clássica e forte trabalho comunitário.',
    ARRAY['Rev. Marcos Rodrigues', 'Diác. Paula Martins'],
    'saopedro@iabpoa.org.br',
    '{"website": "https://iabpoa.org.br"}'::jsonb
  );

  -- 7. Igreja Episcopal de Recife - IEAB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Igreja Episcopal da Santíssima Trindade',
    ieab_id,
    'Rua do Príncipe, 526 - Boa Vista',
    'Recife', 'PE', '50050-410',
    -8.057012, -34.890345,
    '[{"day": "Domingo", "time": "10h00"}, {"day": "Quarta-feira", "time": "19h00"}]'::jsonb,
    'Comunidade episcopal histórica no centro de Recife, ativa desde 1890.',
    ARRAY['Rev. José Fernando Lima'],
    'trindade@episcopalrecife.org',
    '{"website": "https://episcopalrecife.org", "instagram": "@episcopalrecife"}'::jsonb
  );

  -- 8. Igreja Episcopal Carismática de Fortaleza - IECB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Igreja Episcopal Carismática Fonte da Vida',
    iecb_id,
    'Av. Desembargador Moreira, 2100 - Aldeota',
    'Fortaleza', 'CE', '60170-002',
    -3.734123, -38.498267,
    '[{"day": "Domingo", "time": "10h00"}, {"day": "Domingo", "time": "18h00"}, {"day": "Sexta-feira", "time": "20h00"}]'::jsonb,
    'Igreja carismática com adoração vibrante e ênfase em cura e libertação.',
    ARRAY['Pb. Renato Costa', 'Pb. Juliana Sousa'],
    'fontedavida@iecfortaleza.org',
    '{"instagram": "@iecfontedavida", "youtube": "@FontedaVidaIEC", "spotify": "IEC Fonte da Vida"}'::jsonb
  );

  -- 9. Igreja Anglicana de Campinas - IAB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Paróquia Anglicana Santa Cruz',
    iab_id,
    'Rua Conceição, 233 - Centro',
    'Campinas', 'SP', '13010-050',
    -22.905345, -47.061234,
    '[{"day": "Domingo", "time": "9h30"}, {"day": "Terça-feira", "time": "19h30"}]'::jsonb,
    'Paróquia anglicana tradicional servindo a região de Campinas há 30 anos.',
    ARRAY['Rev. Gabriel Araújo'],
    'santacruz@iabcampinas.org.br',
    '{"website": "https://iabcampinas.org.br", "instagram": "@iabsantacruz"}'::jsonb
  );

  -- 10. Comunidade Anglicana de Salvador - REB
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Comunidade Anglicana Nova Aliança',
    reb_id,
    'Av. Sete de Setembro, 3500 - Vitória',
    'Salvador', 'BA', '40080-002',
    -13.007890, -38.507123,
    '[{"day": "Domingo", "time": "10h00"}, {"day": "Domingo", "time": "19h00"}]'::jsonb,
    'Comunidade inclusiva e multicultural no coração de Salvador.',
    ARRAY['Pb. Fernanda Souza', 'Pb. Roberto Santos'],
    'contato@novaaliancassa.org',
    '{"instagram": "@novaaliancassa", "youtube": "@NovaAliancaSSA"}'::jsonb
  );

END $$;

-- Verificar os dados inseridos
SELECT
  c.name,
  j.name as jurisdiction,
  c.city,
  c.state
FROM churches c
JOIN jurisdictions j ON c.jurisdiction_id = j.id
ORDER BY c.city;
