-- =====================================================
-- TABLE: proofreading_v1 (Relecture 1)
-- Description: Première relecture (provient STRICTEMENT d'un seul projet de livre)
-- =====================================================

CREATE TABLE IF NOT EXISTS proofreading_v1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_project_id UUID NOT NULL UNIQUE REFERENCES book_projects(id) ON DELETE CASCADE,
  
  content TEXT,
  status TEXT NOT NULL DEFAULT 'proofreading_1' CHECK (status IN ('proofreading_1', 'proofreading_2', 'edited')),
  workflow_step INTEGER DEFAULT 4 CHECK (workflow_step BETWEEN 4 AND 5),
  progress INTEGER DEFAULT 80 CHECK (progress BETWEEN 0 AND 100),
  
  -- Relecteur
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  
  -- Notes de relecture
  notes TEXT,
  corrections_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Cycle de vie
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE: proofreading_v2 (Relecture 2)
-- Description: Seconde relecture (provient STRICTEMENT d'une seule relecture 1)
-- =====================================================

CREATE TABLE IF NOT EXISTS proofreading_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proofreading_v1_id UUID NOT NULL UNIQUE REFERENCES proofreading_v1(id) ON DELETE CASCADE,
  
  content TEXT,
  status TEXT NOT NULL DEFAULT 'proofreading_2' CHECK (status IN ('proofreading_2', 'edited')),
  workflow_step INTEGER DEFAULT 5 CHECK (workflow_step BETWEEN 5 AND 5),
  progress INTEGER DEFAULT 100 CHECK (progress BETWEEN 0 AND 100),
  
  -- Relecteur
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  
  -- Notes de relecture
  notes TEXT,
  corrections_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Cycle de vie
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ✅ INDEX pour les performances
CREATE INDEX idx_proofreading_v1_book_project_id ON proofreading_v1(book_project_id);
CREATE INDEX idx_proofreading_v1_status ON proofreading_v1(status);
CREATE INDEX idx_proofreading_v1_reviewer_id ON proofreading_v1(reviewer_id);
CREATE INDEX idx_proofreading_v2_proofreading_v1_id ON proofreading_v2(proofreading_v1_id);
CREATE INDEX idx_proofreading_v2_status ON proofreading_v2(status);
CREATE INDEX idx_proofreading_v2_reviewer_id ON proofreading_v2(reviewer_id);

-- ✅ TRIGGER pour updated_at
DROP TRIGGER IF EXISTS update_proofreading_v1_updated_at ON proofreading_v1;
DROP TRIGGER IF EXISTS update_proofreading_v1_updated_at ON proofreading_v1;
CREATE TRIGGER update_proofreading_v1_updated_at
  BEFORE UPDATE ON proofreading_v1
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proofreading_v2_updated_at ON proofreading_v2;
DROP TRIGGER IF EXISTS update_proofreading_v2_updated_at ON proofreading_v2;
CREATE TRIGGER update_proofreading_v2_updated_at
  BEFORE UPDATE ON proofreading_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ✅ ROW LEVEL SECURITY (RLS)
ALTER TABLE proofreading_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofreading_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view proofreading v1"
  ON proofreading_v1 FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can update proofreading v1"
  ON proofreading_v1 FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can view proofreading v2"
  ON proofreading_v2 FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can update proofreading v2"
  ON proofreading_v2 FOR UPDATE
  TO authenticated
  USING (TRUE);

COMMENT ON TABLE proofreading_v1 IS 'Première relecture (provient STRICTEMENT d''un seul projet de livre)';
COMMENT ON TABLE proofreading_v2 IS 'Seconde relecture (provient STRICTEMENT d''une seule relecture 1)';
