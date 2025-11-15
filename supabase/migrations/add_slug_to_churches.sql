-- Migration: Add slug column to churches table for SEO-friendly URLs
-- Created: 2025-11-15

-- Add slug column to churches table
ALTER TABLE churches
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug to ensure no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS churches_slug_unique ON churches(slug);

-- Add comment to the column
COMMENT ON COLUMN churches.slug IS 'URL-friendly slug for SEO-optimized church pages';
