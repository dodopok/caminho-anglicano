-- Caminho Anglicano Database Schema
-- Execute este SQL no Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Churches table
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('IAB', 'IEAB', 'IECB', 'IARB', 'REB')),
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
CREATE INDEX IF NOT EXISTS idx_churches_jurisdiction ON churches(jurisdiction);
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

-- Create trigger for churches table
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_church_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to churches
CREATE POLICY "Enable read access for all users" ON churches
  FOR SELECT USING (true);

-- Create policies for insert access to submissions
CREATE POLICY "Enable insert access for all users" ON church_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert access for all users" ON bulk_church_submissions
  FOR INSERT WITH CHECK (true);

-- Note: Only authenticated admins should be able to:
-- 1. INSERT/UPDATE/DELETE churches
-- 2. SELECT/UPDATE church_submissions and bulk_church_submissions
-- You'll need to create admin policies after setting up authentication
