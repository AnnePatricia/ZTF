-- =====================================================
-- TABLE: raw_files (Fichiers Bruts)
-- Description: Stocke tous les fichiers importés (PDF, Audio, Image)
-- =====================================================

CREATE TABLE IF NOT EXISTS raw_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'audio', 'image')),
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  bucket_name TEXT DEFAULT 'document-files',
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}',
  duration_seconds INTEGER, -- Pour les fichiers audio
  page_count INTEGER, -- Pour les PDF
  
  -- Traçabilité
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Cycle de vie
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ INDEX pour les performances
CREATE INDEX idx_raw_files_file_type ON raw_files(file_type);
CREATE INDEX idx_raw_files_imported_at ON raw_files(imported_at DESC);
CREATE INDEX idx_raw_files_imported_by ON raw_files(imported_by);
CREATE INDEX idx_raw_files_is_deleted ON raw_files(is_deleted) WHERE is_deleted = TRUE;

-- ✅ TRIGGER pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_raw_files_updated_at ON raw_files;
DROP TRIGGER IF EXISTS update_raw_files_updated_at ON raw_files;
CREATE TRIGGER update_raw_files_updated_at
  BEFORE UPDATE ON raw_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ✅ ROW LEVEL SECURITY (RLS)
ALTER TABLE raw_files ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs authentifiés peuvent voir les fichiers
CREATE POLICY "Users can view raw files"
  ON raw_files FOR SELECT
  TO authenticated
  USING (TRUE);

-- Policy: Les utilisateurs authentifiés peuvent importer des fichiers
CREATE POLICY "Users can import raw files"
  ON raw_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = imported_by);

-- Policy: Les utilisateurs authentifiés peuvent modifier leurs fichiers
CREATE POLICY "Users can update their raw files"
  ON raw_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = imported_by);

-- Policy: Les utilisateurs authentifiés peuvent supprimer leurs fichiers (soft delete)
CREATE POLICY "Users can soft delete their raw files"
  ON raw_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = imported_by)
  WITH CHECK (is_deleted = TRUE);

COMMENT ON TABLE raw_files IS 'Stocke tous les fichiers bruts importés (PDF, Audio, Image)';
COMMENT ON COLUMN raw_files.metadata IS 'Métadonnées personnalisées (auteur, langue, lieu, etc.)';
