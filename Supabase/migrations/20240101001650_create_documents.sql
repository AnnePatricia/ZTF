-- =====================================================
-- TABLE: documents (Sessions de correction et documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'document' CHECK (type IN ('document', 'session', 'template', 'correction', 'proofreading', 'translation', 'review', 'transcription', 'report')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'completed', 'archived', 'converting', 'à_traiter', 'transcription_en_cours', 'transcrit', 'projet_de_livre', 'relecture_1_en_cours', 'relecture_1_validé', 'relecture_2_en_cours', 'relecture_2_validé')),
  workflow_step INTEGER DEFAULT 1,
  progress INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_format TEXT CHECK (source_format IN ('docx', 'md', 'epub', 'odt')),
  source_path TEXT,
  source_size INTEGER,
  total_blocks INTEGER DEFAULT 0,
  merged_blocks INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

COMMENT ON TABLE documents IS 'Table des documents et sessions de correction';