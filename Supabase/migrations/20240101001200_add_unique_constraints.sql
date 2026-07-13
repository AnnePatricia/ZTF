-- =====================================================
-- MIGRATION 009: Contraintes d'unicité pour R1 et R2
-- Description: Garantir 1 projet = 1 R1 et 1 R1 = 1 R2
-- =====================================================

-- ✅ 1. CONTRAINTE: Un projet de livre ne peut avoir qu'UNE SEULE relecture 1
-- (La contrainte UNIQUE sur book_project_id dans proofreading_v1 existe déjà, 
--  mais on ajoute un index partiel pour les fichiers non supprimés)

CREATE UNIQUE INDEX IF NOT EXISTS idx_proofreading_v1_unique_book_project
  ON proofreading_v1(book_project_id)
  WHERE is_deleted = FALSE;

COMMENT ON INDEX idx_proofreading_v1_unique_book_project IS 'Garantit qu''un projet de livre a une seule relecture 1 active';


-- ✅ 2. CONTRAINTE: Une relecture 1 ne peut avoir qu'UNE SEULE relecture 2
-- (La contrainte UNIQUE sur proofreading_v1_id dans proofreading_v2 existe déjà,
--  mais on ajoute un index partiel pour les fichiers non supprimés)

CREATE UNIQUE INDEX IF NOT EXISTS idx_proofreading_v2_unique_proofreading_v1
  ON proofreading_v2(proofreading_v1_id)
  WHERE is_deleted = FALSE;

COMMENT ON INDEX idx_proofreading_v2_unique_proofreading_v1 IS 'Garantit qu''une relecture 1 a une seule relecture 2 active';


-- ✅ 3. FONCTION: Vérifier si un projet a déjà une R1 avant insertion
CREATE OR REPLACE FUNCTION check_proofreading_v1_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Compter les R1 existantes pour ce projet (non supprimées)
  SELECT COUNT(*) INTO v_count
  FROM proofreading_v1
  WHERE book_project_id = NEW.book_project_id
  AND is_deleted = FALSE
  AND id != COALESCE(NEW.id, NEW.book_project_id); -- Exclure l'entrée actuelle en cas d'UPDATE
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Un projet de livre ne peut avoir qu''une seule relecture 1. Une relecture 1 existe déjà pour ce projet.'
    USING ERRCODE = '23505', -- unique_violation
          HINT = 'Supprimez d''abord la relecture 1 existante ou utilisez-la.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_proofreading_v1_uniqueness IS 'Vérifie qu''un projet n''a pas déjà une relecture 1 avant insertion';


-- ✅ TRIGGER: Appliquer la vérification avant insertion/MAJ de proofreading_v1
DROP TRIGGER IF EXISTS trigger_check_proofreading_v1_uniqueness ON proofreading_v1;

CREATE CONSTRAINT TRIGGER trigger_check_proofreading_v1_uniqueness
  AFTER INSERT OR UPDATE OF book_project_id ON proofreading_v1
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW
  EXECUTE FUNCTION check_proofreading_v1_uniqueness();


-- ✅ 4. FONCTION: Vérifier si une R1 a déjà une R2 avant insertion
CREATE OR REPLACE FUNCTION check_proofreading_v2_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Compter les R2 existantes pour cette R1 (non supprimées)
  SELECT COUNT(*) INTO v_count
  FROM proofreading_v2
  WHERE proofreading_v1_id = NEW.proofreading_v1_id
  AND is_deleted = FALSE
  AND id != COALESCE(NEW.id, NEW.proofreading_v1_id); -- Exclure l'entrée actuelle en cas d'UPDATE
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Une relecture 1 ne peut avoir qu''une seule relecture 2. Une relecture 2 existe déjà pour cette relecture 1.'
    USING ERRCODE = '23505', -- unique_violation
          HINT = 'Supprimez d''abord la relecture 2 existante ou utilisez-la.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_proofreading_v2_uniqueness IS 'Vérifie qu''une relecture 1 n''a pas déjà une relecture 2 avant insertion';


-- ✅ TRIGGER: Appliquer la vérification avant insertion/MAJ de proofreading_v2
DROP TRIGGER IF EXISTS trigger_check_proofreading_v2_uniqueness ON proofreading_v2;

CREATE CONSTRAINT TRIGGER trigger_check_proofreading_v2_uniqueness
  AFTER INSERT OR UPDATE OF proofreading_v1_id ON proofreading_v2
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW
  EXECUTE FUNCTION check_proofreading_v2_uniqueness();


-- ✅ 5. FONCTION: Vérifier qu'un projet existe avant de créer une R1
CREATE OR REPLACE FUNCTION validate_proofreading_v1_book_project()
RETURNS TRIGGER AS $$
DECLARE
  v_project_status TEXT;
BEGIN
  -- Vérifier que le projet existe
  SELECT status INTO v_project_status
  FROM book_projects
  WHERE id = NEW.book_project_id
  AND is_deleted = FALSE;
  
  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'Le projet de livre spécifié n''existe pas ou a été supprimé.'
    USING ERRCODE = '23503', -- foreign_key_violation
          HINT = 'Vérifiez l''ID du projet de livre.';
  END IF;
  
  -- Vérifier que le projet est au bon statut (optionnel, peut être assoupli)
  -- IF v_project_status NOT IN ('projet_de_livre', 'relecture_1_en_cours') THEN
  --   RAISE NOTICE 'Attention: Le projet de livre n''est pas au statut "projet_de_livre". Statut actuel: %', v_project_status;
  -- END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_proofreading_v1_book_project IS 'Valide qu''un projet de livre existe avant de créer une relecture 1';


-- ✅ TRIGGER: Valider le projet avant insertion de proofreading_v1
DROP TRIGGER IF EXISTS trigger_validate_proofreading_v1_book_project ON proofreading_v1;

DROP TRIGGER IF EXISTS trigger_validate_proofreading_v1_book_project ON proofreading_v1;
CREATE TRIGGER trigger_validate_proofreading_v1_book_project
  BEFORE INSERT ON proofreading_v1
  FOR EACH ROW
  EXECUTE FUNCTION validate_proofreading_v1_book_project();


-- ✅ 6. FONCTION: Vérifier qu'une R1 existe avant de créer une R2
CREATE OR REPLACE FUNCTION validate_proofreading_v2_proofreading_v1()
RETURNS TRIGGER AS $$
DECLARE
  v_r1_status TEXT;
BEGIN
  -- Vérifier que la R1 existe
  SELECT status INTO v_r1_status
  FROM proofreading_v1
  WHERE id = NEW.proofreading_v1_id
  AND is_deleted = FALSE;
  
  IF v_r1_status IS NULL THEN
    RAISE EXCEPTION 'La relecture 1 spécifiée n''existe pas ou a été supprimée.'
    USING ERRCODE = '23503', -- foreign_key_violation
          HINT = 'Vérifiez l''ID de la relecture 1.';
  END IF;
  
  -- Vérifier que la R1 est au bon statut (optionnel, peut être assoupli)
  -- IF v_r1_status NOT IN ('relecture_1_en_cours', 'relecture_1_validé') THEN
  --   RAISE NOTICE 'Attention: La relecture 1 n''est pas au statut attendu. Statut actuel: %', v_r1_status;
  -- END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_proofreading_v2_proofreading_v1 IS 'Valide qu''une relecture 1 existe avant de créer une relecture 2';


-- ✅ TRIGGER: Valider la R1 avant insertion de proofreading_v2
DROP TRIGGER IF EXISTS trigger_validate_proofreading_v2_proofreading_v1 ON proofreading_v2;

DROP TRIGGER IF EXISTS trigger_validate_proofreading_v2_proofreading_v1 ON proofreading_v2;
CREATE TRIGGER trigger_validate_proofreading_v2_proofreading_v1
  BEFORE INSERT ON proofreading_v2
  FOR EACH ROW
  EXECUTE FUNCTION validate_proofreading_v2_proofreading_v1();


-- =====================================================
-- VUES DE CONTRÔLE
-- =====================================================

-- ✅ Vue: Projets sans R1 (pour identification)
CREATE OR REPLACE VIEW projects_without_proofreading_v1 AS
SELECT 
  bp.id,
  bp.title,
  bp.status,
  bp.created_at,
  COUNT(DISTINCT trf.raw_file_id) as raw_files_count
FROM book_projects bp
LEFT JOIN proofreading_v1 pr1 ON bp.id = pr1.book_project_id AND pr1.is_deleted = FALSE
LEFT JOIN book_project_transcriptions bpt ON bp.id = bpt.book_project_id
LEFT JOIN transcription_raw_files trf ON bpt.transcription_id = trf.transcription_id
WHERE bp.is_deleted = FALSE
AND pr1.id IS NULL
GROUP BY bp.id, bp.title, bp.status, bp.created_at;

COMMENT ON VIEW projects_without_proofreading_v1 IS 'Liste des projets de livre sans relecture 1';


-- ✅ Vue: R1 sans R2 (pour identification)
CREATE OR REPLACE VIEW proofreading_v1_without_proofreading_v2 AS
SELECT 
  pr1.id,
  pr1.book_project_id,
  pr1.status,
  pr1.reviewer_name,
  pr1.created_at,
  bp.title as book_project_title
FROM proofreading_v1 pr1
LEFT JOIN proofreading_v2 pr2 ON pr1.id = pr2.proofreading_v1_id AND pr2.is_deleted = FALSE
INNER JOIN book_projects bp ON pr1.book_project_id = bp.id
WHERE pr1.is_deleted = FALSE
AND pr2.id IS NULL;

COMMENT ON VIEW proofreading_v1_without_proofreading_v2 IS 'Liste des relectures 1 sans relecture 2';


-- ✅ Vue: Doublons potentiels R1 (en cas de problème de données)
CREATE OR REPLACE VIEW potential_proofreading_v1_duplicates AS
SELECT 
  book_project_id,
  COUNT(*) as proofreading_count,
  array_agg(id) as proofreading_ids
FROM proofreading_v1
WHERE is_deleted = FALSE
GROUP BY book_project_id
HAVING COUNT(*) > 1;

COMMENT ON VIEW potential_proofreading_v1_duplicates IS 'Identifie les projets avec plusieurs R1 (devrait être vide)';


-- ✅ Vue: Doublons potentiels R2 (en cas de problème de données)
CREATE OR REPLACE VIEW potential_proofreading_v2_duplicates AS
SELECT 
  proofreading_v1_id,
  COUNT(*) as proofreading_count,
  array_agg(id) as proofreading_ids
FROM proofreading_v2
WHERE is_deleted = FALSE
GROUP BY proofreading_v1_id
HAVING COUNT(*) > 1;

COMMENT ON VIEW potential_proofreading_v2_duplicates IS 'Identifie les R1 avec plusieurs R2 (devrait être vide)';


-- =====================================================
-- RÉSUMÉ DES CONTRAINTES CRÉÉES
-- =====================================================
-- 1. Index unique: 1 projet = 1 R1 (idx_proofreading_v1_unique_book_project)
-- 2. Index unique: 1 R1 = 1 R2 (idx_proofreading_v2_unique_proofreading_v1)
-- 3. Trigger: Vérification unicité R1 avant insertion (trigger_check_proofreading_v1_uniqueness)
-- 4. Trigger: Vérification unicité R2 avant insertion (trigger_check_proofreading_v2_uniqueness)
-- 5. Trigger: Validation existence projet avant R1 (trigger_validate_proofreading_v1_book_project)
-- 6. Trigger: Validation existence R1 avant R2 (trigger_validate_proofreading_v2_proofreading_v1)
-- 7. Vue: Projets sans R1 (projects_without_proofreading_v1)
-- 8. Vue: R1 sans R2 (proofreading_v1_without_proofreading_v2)
-- 9. Vue: Doublons R1 (potential_proofreading_v1_duplicates)
-- 10. Vue: Doublons R2 (potential_proofreading_v2_duplicates)

