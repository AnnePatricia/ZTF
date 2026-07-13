-- Migration: Create translation_tasks table (D7)
-- Module D7 — Traduction Anglais → Français

-- 1. Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS translation_tasks CASCADE;

-- 2. Créer la table translation_tasks
CREATE TABLE translation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien vers le livre et la tâche source (D6)
  book_id UUID REFERENCES ztf_books(id) ON DELETE CASCADE,
  source_task_id UUID REFERENCES correction_tasks(id),
  
  -- Contenu traduit
  translated_content TEXT,
  original_content TEXT, -- Contenu anglais de D6
  
  -- Statut et workflow (7 passes)
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'in_progress',
    'pass_1_reading',
    'pass_2_comprehension',
    'pass_3_terminology',
    'pass_4_first_draft',
    'pass_5_revision',
    'pass_6_doctrinal',
    'pass_7_linguistic',
    'submitted', 
    'validated', 
    'rejected'
  )),
  
  current_pass INTEGER DEFAULT 0, -- 0: non commencé, 1-7: passes
  
  -- Assignation
  assigned_to UUID REFERENCES ztf_users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  
  -- Double validation (2 traducteurs)
  validator_1 UUID REFERENCES ztf_users(id),
  validator_1_validated_at TIMESTAMP WITH TIME ZONE,
  validator_1_notes TEXT,
  
  validator_2 UUID REFERENCES ztf_users(id),
  validator_2_validated_at TIMESTAMP WITH TIME ZONE,
  validator_2_notes TEXT,
  
  -- Validation finale par le Chef D7
  approved_by UUID REFERENCES ztf_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Statistiques
  word_count INTEGER DEFAULT 0,
  translation_quality_score INTEGER, -- Score de qualité 0-100
  doctrinal_issues TEXT, -- Problèmes doctrinaux détectés
  linguistic_notes TEXT, -- Notes linguistiques
  
  -- Métadonnées
  manuscript_title TEXT,
  manuscript_theme TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- 3. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_translation_tasks_book_id ON translation_tasks(book_id);
CREATE INDEX IF NOT EXISTS idx_translation_tasks_status ON translation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_translation_tasks_assigned_to ON translation_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_translation_tasks_current_pass ON translation_tasks(current_pass);

-- 4. Row Level Security (RLS)
ALTER TABLE translation_tasks ENABLE ROW LEVEL SECURITY;

-- 5. Politiques RLS
CREATE POLICY "Users can view translation tasks from their department"
  ON translation_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ztf_users
      WHERE ztf_users.id = auth.uid()
      AND (
        ztf_users.role = 'admin'
        OR ztf_users.role = 'chef_d7'
        OR ztf_users.role = 'membre_d7'
      )
    )
  );

CREATE POLICY "Members can update assigned translation tasks"
  ON translation_tasks FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ztf_users
      WHERE ztf_users.id = auth.uid()
      AND ztf_users.role IN ('admin', 'chef_d7')
    )
  );

CREATE POLICY "Admins and chefs can insert translation tasks"
  ON translation_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ztf_users
      WHERE ztf_users.id = auth.uid()
      AND ztf_users.role IN ('admin', 'chef_d7')
    )
  );

-- 6. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_translation_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger pour updated_at
DROP TRIGGER IF EXISTS update_translation_task_timestamp ON translation_tasks;

CREATE TRIGGER update_translation_task_timestamp
  BEFORE UPDATE ON translation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_task_updated_at();

-- 8. Commentaire
COMMENT ON TABLE translation_tasks IS 'Module D7 — Traduction: Traduction Anglais → Français avec fidélité doctrinale ZTF';