-- Migration: Liturgy Management System
-- Description: Creates tables for liturgy planning, ministry scheduling, and service generation

-- ============================================================================
-- 1. LITURGY PEOPLE (Pessoas que podem ser escaladas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  is_ordained BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liturgy_people_active ON liturgy_people(is_active);
CREATE INDEX idx_liturgy_people_ordained ON liturgy_people(is_ordained);

-- ============================================================================
-- 2. LITURGY MINISTRIES (Ministérios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  requires_ordained BOOLEAN DEFAULT FALSE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liturgy_ministries_active ON liturgy_ministries(is_active);
CREATE INDEX idx_liturgy_ministries_order ON liturgy_ministries(display_order);

-- ============================================================================
-- 3. SERVICE TYPES (Tipos de culto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  default_template JSONB, -- Estrutura padrão do culto
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liturgy_service_types_active ON liturgy_service_types(is_active);

-- ============================================================================
-- 4. LITURGY SERVICES (Cultos agendados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES liturgy_service_types(id) ON DELETE RESTRICT,
  service_date DATE NOT NULL,
  service_time TIME,

  -- Informações litúrgicas
  liturgical_season TEXT, -- Ex: "Tempo Comum", "Advento", "Quaresma"
  liturgical_week TEXT, -- Ex: "22° Domingo após Pentecostes"
  liturgical_color TEXT, -- Ex: "Verde", "Roxo", "Branco"

  -- Leituras
  readings JSONB, -- { "salmo": "17.1-9", "evangelho": "Lucas 20:27-38", ... }
  collect_text TEXT, -- Coleta do dia

  -- Músicas
  songs TEXT[], -- Array de músicas

  -- Avisos
  notices TEXT[],

  -- Observações
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'draft', -- draft, scheduled, completed
  is_published BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liturgy_services_date ON liturgy_services(service_date DESC);
CREATE INDEX idx_liturgy_services_type ON liturgy_services(service_type_id);
CREATE INDEX idx_liturgy_services_status ON liturgy_services(status);
CREATE INDEX idx_liturgy_services_published ON liturgy_services(is_published);

-- ============================================================================
-- 5. LITURGY SCHEDULES (Escalas - ligação pessoa + ministério + culto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES liturgy_services(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES liturgy_ministries(id) ON DELETE RESTRICT,
  person_id UUID REFERENCES liturgy_people(id) ON DELETE RESTRICT,

  -- Confirmação
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  confirmation_method TEXT, -- 'site', 'whatsapp', 'phone', 'in_person'

  -- Substituição
  is_substitute BOOLEAN DEFAULT FALSE,
  replaced_person_id UUID REFERENCES liturgy_people(id) ON DELETE SET NULL,

  -- Notificação
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,

  -- Observações
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(service_id, ministry_id, person_id)
);

CREATE INDEX idx_liturgy_schedules_service ON liturgy_schedules(service_id);
CREATE INDEX idx_liturgy_schedules_person ON liturgy_schedules(person_id);
CREATE INDEX idx_liturgy_schedules_ministry ON liturgy_schedules(ministry_id);
CREATE INDEX idx_liturgy_schedules_confirmed ON liturgy_schedules(confirmed);
CREATE INDEX idx_liturgy_schedules_notified ON liturgy_schedules(notified);

-- ============================================================================
-- 6. LITURGY TEXTS (Textos litúrgicos reutilizáveis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'confession', 'absolution', 'eucharistic_prayer', 'preface', etc.
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Quando usar
  liturgical_season TEXT, -- NULL = qualquer tempo
  is_default BOOLEAN DEFAULT FALSE,

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category, slug)
);

CREATE INDEX idx_liturgy_texts_category ON liturgy_texts(category);
CREATE INDEX idx_liturgy_texts_season ON liturgy_texts(liturgical_season);
CREATE INDEX idx_liturgy_texts_default ON liturgy_texts(is_default);
CREATE INDEX idx_liturgy_texts_active ON liturgy_texts(is_active);

-- ============================================================================
-- 7. LITURGY NOTICES (Avisos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Tipo
  is_recurring BOOLEAN DEFAULT FALSE, -- Aviso padrão que aparece sempre

  -- Recorrência
  recurrence_rule TEXT, -- Cron-like ou JSON: { "every": "sunday" }
  start_date DATE,
  end_date DATE,

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liturgy_notices_recurring ON liturgy_notices(is_recurring);
CREATE INDEX idx_liturgy_notices_active ON liturgy_notices(is_active);
CREATE INDEX idx_liturgy_notices_dates ON liturgy_notices(start_date, end_date);

-- ============================================================================
-- 8. LITURGY READINGS (Lecionário Comum Revisado)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liturgical_year TEXT NOT NULL, -- 'A', 'B', 'C'
  liturgical_date TEXT NOT NULL, -- Ex: "22nd Sunday after Pentecost"
  date_reference DATE, -- Data de referência (pode mudar a cada ano)

  -- Leituras
  old_testament TEXT,
  psalm TEXT NOT NULL,
  epistle TEXT,
  gospel TEXT NOT NULL,

  -- Metadata
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(liturgical_year, liturgical_date)
);

CREATE INDEX idx_liturgy_readings_year ON liturgy_readings(liturgical_year);
CREATE INDEX idx_liturgy_readings_date_ref ON liturgy_readings(date_reference);

-- ============================================================================
-- 9. LITURGY COLLECTS (Coletas do LOC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_collects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liturgical_date TEXT NOT NULL UNIQUE, -- Ex: "22° Domingo após Pentecostes"
  content TEXT NOT NULL,
  source TEXT, -- Ex: "LOC 2015, p. 234"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_liturgy_collects_date ON liturgy_collects(liturgical_date);

-- ============================================================================
-- 10. LITURGY PERMISSIONS (Permissões de usuários)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liturgy_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES liturgy_people(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'admin', 'editor', 'viewer'

  -- Permissões específicas
  can_create_services BOOLEAN DEFAULT FALSE,
  can_edit_services BOOLEAN DEFAULT FALSE,
  can_delete_services BOOLEAN DEFAULT FALSE,
  can_manage_people BOOLEAN DEFAULT FALSE,
  can_manage_texts BOOLEAN DEFAULT FALSE,
  can_send_notifications BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person_id)
);

CREATE INDEX idx_liturgy_permissions_person ON liturgy_permissions(person_id);
CREATE INDEX idx_liturgy_permissions_role ON liturgy_permissions(role);

-- ============================================================================
-- SEED DATA: Ministérios padrão
-- ============================================================================
INSERT INTO liturgy_ministries (name, slug, requires_ordained, display_order) VALUES
('Presidindo', 'presidindo', TRUE, 1),
('Acolhida/Abertura', 'acolhida', FALSE, 2),
('Confissão', 'confissao', FALSE, 3),
('Absolvição', 'absolvicao', TRUE, 4),
('Leitura', 'leitura', FALSE, 5),
('Salmo', 'salmo', FALSE, 6),
('Ofertório', 'ofertorio', FALSE, 7),
('Sermão', 'sermao', FALSE, 8),
('Eucaristia (Servindo)', 'eucaristia-servindo', FALSE, 9),
('Credo', 'credo', FALSE, 10),
('Avisos', 'avisos', FALSE, 11),
('Benção', 'bencao', TRUE, 12),
('Despedida', 'despedida', FALSE, 13),
('Café', 'cafe', FALSE, 14),
('Lojinha', 'lojinha', FALSE, 15),
('Mídia', 'midia', FALSE, 16),
('Holyrics', 'holyrics', FALSE, 17),
('Sodalício', 'sodalicio', FALSE, 18)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED DATA: Tipos de serviço
-- ============================================================================
INSERT INTO liturgy_service_types (name, slug, description) VALUES
('Culto Eucarístico', 'eucaristico', 'Culto dominical com Santa Ceia'),
('Ofício Matutino', 'oficio-matutino', 'Oração diária matutina'),
('Ofício Vespertino', 'oficio-vespertino', 'Oração vespertina'),
('Culto Especial', 'especial', 'Páscoa, Natal, Batismo, etc.')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TRIGGERS: Updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_liturgy_people_updated_at BEFORE UPDATE ON liturgy_people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_ministries_updated_at BEFORE UPDATE ON liturgy_ministries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_service_types_updated_at BEFORE UPDATE ON liturgy_service_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_services_updated_at BEFORE UPDATE ON liturgy_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_schedules_updated_at BEFORE UPDATE ON liturgy_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_texts_updated_at BEFORE UPDATE ON liturgy_texts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_notices_updated_at BEFORE UPDATE ON liturgy_notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_readings_updated_at BEFORE UPDATE ON liturgy_readings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_collects_updated_at BEFORE UPDATE ON liturgy_collects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_permissions_updated_at BEFORE UPDATE ON liturgy_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS (Row Level Security) - Comentado para desenvolvimento inicial
-- ============================================================================
-- ALTER TABLE liturgy_people ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE liturgy_ministries ENABLE ROW LEVEL SECURITY;
-- ... (adicionar políticas conforme necessário)

COMMENT ON TABLE liturgy_people IS 'Pessoas que podem ser escaladas para ministérios';
COMMENT ON TABLE liturgy_ministries IS 'Tipos de ministérios disponíveis';
COMMENT ON TABLE liturgy_service_types IS 'Tipos de cultos/serviços';
COMMENT ON TABLE liturgy_services IS 'Cultos agendados';
COMMENT ON TABLE liturgy_schedules IS 'Escalas - ligação entre culto, ministério e pessoa';
COMMENT ON TABLE liturgy_texts IS 'Textos litúrgicos reutilizáveis';
COMMENT ON TABLE liturgy_notices IS 'Avisos para incluir nos cultos';
COMMENT ON TABLE liturgy_readings IS 'Lecionário Comum Revisado';
COMMENT ON TABLE liturgy_collects IS 'Coletas do LOC por domingo';
COMMENT ON TABLE liturgy_permissions IS 'Permissões de usuários no sistema de liturgia';
