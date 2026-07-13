-- =====================================================
-- MIGRATION 012: Extension book_projects (stage)
-- Description: Ajoute une colonne stage comme alias sémantique de workflow_step
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. AJOUTER LA COLONNE stage
-- =====================================================

ALTER TABLE book_projects
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'projet_de_livre';

-- Commentaire
COMMENT ON COLUMN book_projects.stage IS '
  Stade éditorial du projet (alias sémantique de workflow_step) :
  - projet_de_livre : Projet créé, transcriptions liées
  - relecture_1_en_cours : R1 créée, en cours de relecture
  - relecture_1_validé : R1 validée, prête pour R2
  - relecture_2_en_cours : R2 créée, en cours de relecture
  - relecture_2_validé : R2 validée, prêt pour publication
';

-- =====================================================
-- 2. METTRE À JOUR LES DONNÉES EXISTANTES
-- =====================================================

-- Mapper workflow_step vers stage
UPDATE book_projects
SET stage = CASE
  WHEN workflow_step = 4 THEN 'projet_de_livre'
  WHEN workflow_step = 4 AND status = 'relecture_1_en_cours' THEN 'relecture_1_en_cours'
  WHEN workflow_step = 4 AND status = 'relecture_1_validé' THEN 'relecture_1_validé'
  WHEN workflow_step = 5 THEN 'relecture_2_en_cours'
  WHEN workflow_step = 5 AND status = 'relecture_2_validé' THEN 'relecture_2_validé'
  ELSE 'projet_de_livre'
END
WHERE stage IS NULL OR stage = 'projet_de_livre';

-- =====================================================
-- 3. INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_book_projects_stage ON book_projects(stage);

-- =====================================================
-- 4. VUE UTILITAIRE
-- =====================================================

-- Vue pour voir la progression des projets
CREATE OR REPLACE VIEW book_projects_progress AS
SELECT
  bp.id,
  bp.title,
  bp.stage,
  bp.workflow_step,
  bp.progress,
  bp.status,
  bp.created_by,
  u.full_name as created_by_name,
  (SELECT COUNT(*) FROM book_project_transcriptions bpt WHERE bpt.book_project_id = bp.id) as nb_transcriptions,
  (SELECT COUNT(*) FROM proofreading_v1 pr1 WHERE pr1.book_project_id = bp.id AND pr1.is_deleted = FALSE) as nb_proofreading_v1,
  (SELECT COUNT(*) FROM proofreading_v2 pr2 
   INNER JOIN proofreading_v1 pr1 ON pr2.proofreading_v1_id = pr1.id 
   WHERE pr1.book_project_id = bp.id AND pr2.is_deleted = FALSE) as nb_proofreading_v2
FROM book_projects bp
LEFT JOIN users u ON bp.created_by = u.id
ORDER BY bp.created_at DESC;

COMMENT ON VIEW book_projects_progress IS 'Vue de la progression des projets avec comptages';

-- =====================================================
-- 5. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 012 appliquée avec succès !';
  RAISE NOTICE '   - Colonne stage ajoutée à book_projects';
  RAISE NOTICE '   - Vue book_projects_progress créée';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT title, stage, workflow_step, status FROM book_projects;';
END $$;

