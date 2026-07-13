-- =====================================================
-- TABLE: book_projects (Projets de Livre)
-- Description: Assemblage de plusieurs transcriptions en un projet de livre
-- =====================================================

CREATE TABLE IF NOT EXISTS book_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'book_project' CHECK (status IN (
    'book_project',
    'proofreading_1',
    'proofreading_2',
    'edited'
  )),
  
  -- Workflow
  workflow_step INTEGER DEFAULT 3 CHECK (workflow_step BETWEEN 3 AND 5),
  progress INTEGER DEFAULT 60 CHECK (progress BETWEEN 0 AND 100),
  
  -- Métadonnées du livre
  author TEXT,
  publisher TEXT,
  publication_year INTEGER,
  isbn TEXT,
  volume_number INTEGER,
  chapter_count INTEGER,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Assignation
  assigned_to TEXT,
  
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
CREATE INDEX idx_book_projects_status ON book_projects(status);
CREATE INDEX idx_book_projects_assigned_to ON book_projects(assigned_to);
CREATE INDEX idx_book_projects_created_at ON book_projects(created_at DESC);
CREATE INDEX idx_book_projects_author ON book_projects(author);
CREATE INDEX idx_book_projects_is_deleted ON book_projects(is_deleted) WHERE is_deleted = TRUE;

-- ✅ TRIGGER pour updated_at
DROP TRIGGER IF EXISTS update_book_projects_updated_at ON book_projects;
DROP TRIGGER IF EXISTS update_book_projects_updated_at ON book_projects;
CREATE TRIGGER update_book_projects_updated_at
  BEFORE UPDATE ON book_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ✅ ROW LEVEL SECURITY (RLS)
ALTER TABLE book_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view book projects"
  ON book_projects FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can create book projects"
  ON book_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update book projects"
  ON book_projects FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can soft delete book projects"
  ON book_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'editor')
  ))
  WITH CHECK (is_deleted = TRUE);

COMMENT ON TABLE book_projects IS 'Assemblage de plusieurs transcriptions en un projet de livre';
