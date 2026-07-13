-- =====================================================
-- TABLE: transcriptions
-- Description: Stocke les transcriptions (peut provenir de plusieurs fichiers bruts)
-- =====================================================

CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'imported' CHECK (status IN (
    'imported',
    'transcribing',
    'transcribed',
    'book_project',
    'proofreading_1',
    'proofreading_2',
    'edited'
  )),
  
  -- Workflow
  workflow_step INTEGER DEFAULT 1 CHECK (workflow_step BETWEEN 1 AND 5),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  
  -- Assignation
  assigned_to TEXT,
  
  -- Métadonnées
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  source TEXT,
  language TEXT DEFAULT 'fr',
  
  -- Traçabilité
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Cycle de vie
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ✅ INDEX pour les performances
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
CREATE INDEX idx_transcriptions_assigned_to ON transcriptions(assigned_to);
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);
CREATE INDEX idx_transcriptions_tags ON transcriptions USING GIN(tags);
CREATE INDEX idx_transcriptions_is_deleted ON transcriptions(is_deleted) WHERE is_deleted = TRUE;

-- ✅ TRIGGER pour updated_at
DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
CREATE TRIGGER update_transcriptions_updated_at
  BEFORE UPDATE ON transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ✅ ROW LEVEL SECURITY (RLS)
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transcriptions"
  ON transcriptions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can create transcriptions"
  ON transcriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update transcriptions"
  ON transcriptions FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can soft delete transcriptions"
  ON transcriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'editor')
  ))
  WITH CHECK (is_deleted = TRUE);

COMMENT ON TABLE transcriptions IS 'Stocke les transcriptions (peut provenir de plusieurs fichiers bruts)';
