-- SQL para inserir novas igrejas da REB
-- Execute este script no Supabase SQL Editor

DO $$
DECLARE
  reb_id UUID;
BEGIN
  -- Buscar o ID da jurisdição REB
  SELECT id INTO reb_id FROM jurisdictions WHERE slug = 'REB';

  -- 1. Comunidade Anglicana Refúgio - Manaus/AM
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Comunidade Anglicana Refúgio',
    reb_id,
    'Avenida Cosme Ferreira, 996 - Coroado II',
    'Manaus', 'AM', '69082-230',
    -3.085669, -59.983415,
    '[{"day": "Domingo", "time": "17h30"}]'::jsonb,
    'UM FAROL DE ESPERANÇA A TODOS QUE QUEREM UM ABRIGO E RECOMEÇO',
    ARRAY['Pb. Fabiano Wesner'],
    'episcopalbrasileira@gmail.com',
    '{"instagram": "@anglicana_refugio"}'::jsonb
  );

  -- 2. Estação Casa - Igreja Anglicana - Belo Horizonte/MG
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Estação Casa - Igreja Anglicana',
    reb_id,
    'Rua Aarão Reis, 496 B (2º andar)',
    'Belo Horizonte', 'MG', '30120-000',
    -19.919080, -43.934350,
    '[{"day": "Domingo", "time": "9h30"}]'::jsonb,
    '🛤️ ✝ 🔺 ☕ 🧀 ⛪ 🏠',
    ARRAY['Rev. Jaime Sepulcro'],
    'episcopalbrasileira@gmail.com',
    '{"instagram": "@estacao.casa", "youtube": "https://www.youtube.com/@EstacaoCasa"}'::jsonb
  );

  -- 3. Igreja Anglicana Família - Jacareí/SP
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Igreja Anglicana Família',
    reb_id,
    'Rua João Ribeiro, 16 Veraneio Ijal',
    'Jacareí', 'SP', '12326-680',
    -23.308070, -46.031185,
    '[{"day": "Domingo", "time": "9h00"}]'::jsonb,
    'Ser família é bom demais',
    ARRAY['Rev. Reinaldo de Souza'],
    'episcopalbrasileira@gmail.com',
    '{"instagram": "@igrejaanglicanafamilia"}'::jsonb
  );

  -- 4. Catedral Anglicana Âncora - Vitória/ES
  INSERT INTO churches (
    name, jurisdiction_id, address, city, state, postal_code,
    latitude, longitude, schedules, description, pastors,
    responsible_email, social_media
  ) VALUES (
    'Catedral Anglicana Âncora',
    reb_id,
    'Rua General Osório, 127 - Centro',
    'Vitória', 'ES', '29020-000',
    -20.320870, -40.340790,
    '[{"day": "Domingo", "time": "10h00"}, {"day": "Quarta-feira", "time": "20h00"}]'::jsonb,
    'Catedral Anglicana Âncora em Vitória - ES',
    ARRAY['Rev. Elionai Rodrigues'],
    'episcopalbrasileira@gmail.com',
    '{"instagram": "@igrejaancora", "youtube": "https://www.youtube.com/@igrejaancora"}'::jsonb
  );

END $$;

-- Verificar os dados inseridos
SELECT
  c.name,
  j.name as jurisdiction,
  c.city,
  c.state,
  c.schedules
FROM churches c
JOIN jurisdictions j ON c.jurisdiction_id = j.id
WHERE c.name IN (
  'Comunidade Anglicana Refúgio',
  'Estação Casa - Igreja Anglicana',
  'Igreja Anglicana Família',
  'Catedral Anglicana Âncora'
)
ORDER BY c.city;
