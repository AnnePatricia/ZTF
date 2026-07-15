-- Ajouter les colonnes dénormalisées à ztf_activity_log
ALTER TABLE ztf_activity_log 
ADD COLUMN IF NOT EXISTS book_title TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON ztf_activity_log(created_at DESC);

-- Vérifier la structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ztf_activity_log'
ORDER BY ordinal_position;