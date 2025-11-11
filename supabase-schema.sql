-- Caminho Anglicano Database Schema
-- Execute este SQL no Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jurisdictions table
CREATE TABLE IF NOT EXISTS jurisdictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  website TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Churches table
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  schedules JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  pastors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  responsible_email TEXT NOT NULL,
  social_media JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Church submissions table (single church submissions)
CREATE TABLE IF NOT EXISTS church_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  schedules TEXT,
  description TEXT,
  pastors TEXT,
  responsible_email TEXT NOT NULL,
  website TEXT,
  instagram TEXT,
  youtube TEXT,
  spotify TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

-- Bulk church submissions table (multiple churches in one submission)
CREATE TABLE IF NOT EXISTS bulk_church_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bulk_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jurisdictions_slug ON jurisdictions(slug);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_active ON jurisdictions(active);
CREATE INDEX IF NOT EXISTS idx_churches_jurisdiction_id ON churches(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_churches_city ON churches(city);
CREATE INDEX IF NOT EXISTS idx_churches_state ON churches(state);
CREATE INDEX IF NOT EXISTS idx_churches_postal_code ON churches(postal_code);
CREATE INDEX IF NOT EXISTS idx_churches_location ON churches(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_church_submissions_status ON church_submissions(status);
CREATE INDEX IF NOT EXISTS idx_bulk_submissions_status ON bulk_church_submissions(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_jurisdictions_updated_at
  BEFORE UPDATE ON jurisdictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_church_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON jurisdictions
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON churches
  FOR SELECT USING (true);

-- Create policies for insert access to submissions
CREATE POLICY "Enable insert access for all users" ON church_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert access for all users" ON bulk_church_submissions
  FOR INSERT WITH CHECK (true);

-- Note: Only authenticated admins should be able to:
-- 1. INSERT/UPDATE/DELETE churches
-- 2. INSERT/UPDATE/DELETE jurisdictions
-- 3. SELECT/UPDATE church_submissions and bulk_church_submissions
-- You'll need to create admin policies after setting up authentication

-- Insert default jurisdictions
INSERT INTO jurisdictions (slug, name, full_name, color, description, display_order) VALUES
  ('IAB', 'IAB', 'Igreja Anglicana do Brasil', '#3B82F6', 'Igreja Anglicana do Brasil', 1),
  ('IEAB', 'IEAB', 'Igreja Episcopal Anglicana do Brasil', '#10B981', 'Igreja Episcopal Anglicana do Brasil', 2),
  ('IECB', 'IECB', 'Igreja Episcopal Carismática do Brasil', '#F59E0B', 'Igreja Episcopal Carismática do Brasil', 3),
  ('IARB', 'IARB', 'Igreja Anglicana Reformada do Brasil', '#EF4444', 'Igreja Anglicana Reformada do Brasil', 4),
  ('REB', 'REB', 'Rede Evangélica Brasileira', '#8B5CF6', 'Rede Evangélica Brasileira', 5)
ON CONFLICT (slug) DO NOTHING;
