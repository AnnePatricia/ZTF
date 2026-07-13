-- =====================================================
-- AJOUT DES COLONNES ZTF MANQUANTES À raw_files
-- =====================================================

-- Ajouter la colonne expected_nomenclature
ALTER TABLE raw_files 
  ADD COLUMN IF NOT EXISTS expected_nomenclature TEXT;

-- Ajouter les autres colonnes ZTF si elles n'existent pas
ALTER TABLE raw_files 
  ADD COLUMN IF NOT EXISTS ztf_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ztf_type TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN',
  ADD COLUMN IF NOT EXISTS nomenclature_valid BOOLEAN DEFAULT FALSE;

-- Vérification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'raw_files' 
AND column_name IN ('ztf_id', 'ztf_type', 'theme', 'language', 'nomenclature_valid', 'expected_nomenclature')
ORDER BY column_name;