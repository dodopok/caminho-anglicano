-- Políticas RLS para permitir submissões públicas de igrejas
-- Execute este SQL no Supabase SQL Editor

-- Primeiro, remova TODAS as políticas existentes das tabelas de submissão
DROP POLICY IF EXISTS "Enable insert access for all users" ON church_submissions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON bulk_church_submissions;
DROP POLICY IF EXISTS "Allow public insert on church_submissions" ON church_submissions;
DROP POLICY IF EXISTS "Allow public insert on bulk_church_submissions" ON bulk_church_submissions;
DROP POLICY IF EXISTS "Enable insert for anonymous and authenticated users" ON church_submissions;
DROP POLICY IF EXISTS "Enable insert for anonymous and authenticated users" ON bulk_church_submissions;

-- Desabilitar RLS temporariamente para limpar
ALTER TABLE church_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_church_submissions DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE church_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_church_submissions ENABLE ROW LEVEL SECURITY;

-- Criar políticas com nomes únicos para permitir INSERT público
CREATE POLICY "church_submissions_insert_policy"
ON church_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "bulk_church_submissions_insert_policy"
ON bulk_church_submissions
FOR INSERT
WITH CHECK (true);

-- Opcional: Adicione políticas de leitura se quiser que submissões sejam visíveis
-- Descomente se necessário:

-- CREATE POLICY "Enable read for all users"
-- ON church_submissions
-- FOR SELECT
-- TO public
-- USING (true);

-- CREATE POLICY "Enable read for all users"
-- ON bulk_church_submissions
-- FOR SELECT
-- TO public
-- USING (true);
