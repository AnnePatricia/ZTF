-- =====================================================
-- MIGRATION 010: Fonctions de validation des noms de fichiers
-- Description: Valider la conformité des noms entre fichiers liés
-- =====================================================

-- ✅ 1. FONCTION: Valider nom transcrit = nom brut (même base, extension différente)
CREATE OR REPLACE FUNCTION validate_transcription_name(
  p_raw_file_id UUID, 
  p_transcription_file_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_raw_file_name TEXT;
  v_raw_base_name TEXT;
  v_transcription_base_name TEXT;
  v_raw_extension TEXT;
  v_transcription_extension TEXT;
BEGIN
  -- Récupérer le nom du fichier brut
  SELECT file_name INTO v_raw_file_name
  FROM raw_files
  WHERE id = p_raw_file_id
  AND is_deleted = FALSE;
  
  -- Si le fichier brut n'existe pas, retourner FALSE
  IF v_raw_file_name IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Extraire le nom de base et l'extension du fichier brut
  -- Ex: "interview_001.mp3" → base: "interview_001", extension: "mp3"
  v_raw_extension := LOWER(SUBSTRING(v_raw_file_name FROM '\.([^\.]+)$'));
  v_raw_base_name := SUBSTRING(v_raw_file_name FROM '^(.*)\.');
  
  -- Si pas d'extension, utiliser le nom complet
  IF v_raw_base_name IS NULL THEN
    v_raw_base_name := v_raw_file_name;
    v_raw_extension := '';
  END IF;
  
  -- Extraire le nom de base et l'extension du fichier transcrit
  v_transcription_extension := LOWER(SUBSTRING(p_transcription_file_name FROM '\.([^\.]+)$'));
  v_transcription_base_name := SUBSTRING(p_transcription_file_name FROM '^(.*)\.');
  
  -- Si pas d'extension, utiliser le nom complet
  IF v_transcription_base_name IS NULL THEN
    v_transcription_base_name := p_transcription_file_name;
    v_transcription_extension := '';
  END IF;
  
  -- Vérifier que les noms de base sont identiques
  -- Ex: "interview_001" = "interview_001" ✓
  -- Ex: "interview_001" ≠ "autre_nom" ✗
  IF v_raw_base_name = v_transcription_base_name THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_transcription_name IS 'Valide qu''un fichier transcrit a le même nom de base que le fichier brut (ex: "interview.mp3" → "interview.txt")';


-- ✅ 2. FONCTION: Valider nom R1 = nom Projet + "_R1"
CREATE OR REPLACE FUNCTION validate_proofreading_v1_name(
  p_book_project_id UUID, 
  p_proofreading_file_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_project_title TEXT;
  v_expected_pattern TEXT;
  v_file_base_name TEXT;
BEGIN
  -- Récupérer le titre du projet
  SELECT title INTO v_project_title
  FROM book_projects
  WHERE id = p_book_project_id
  AND is_deleted = FALSE;
  
  -- Si le projet n'existe pas, retourner FALSE
  IF v_project_title IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Extraire le nom de base du fichier (sans extension)
  v_file_base_name := SUBSTRING(p_proofreading_file_name FROM '^(.*)\.');
  
  -- Si pas d'extension, utiliser le nom complet
  IF v_file_base_name IS NULL THEN
    v_file_base_name := p_proofreading_file_name;
  END IF;
  
  -- Vérifier que le nom commence par le titre du projet + "_R1"
  -- Ex: "Mon Livre" → "Mon Livre_R1.pdf" ✓
  -- Ex: "Mon Livre" → "Autre Nom_R1.pdf" ✗
  v_expected_pattern := v_project_title || '_R1';
  
  IF v_file_base_name = v_expected_pattern THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_proofreading_v1_name IS 'Valide qu''un fichier R1 a pour nom le titre du projet + "_R1" (ex: "Mon Livre" → "Mon Livre_R1.pdf")';


-- ✅ 3. FONCTION: Valider nom R2 = nom R1 + "_R2" (ou nom Projet + "_R2")
CREATE OR REPLACE FUNCTION validate_proofreading_v2_name(
  p_proofreading_v1_id UUID, 
  p_proofreading_file_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_r1_book_project_id UUID;
  v_project_title TEXT;
  v_expected_pattern TEXT;
  v_file_base_name TEXT;
BEGIN
  -- Récupérer le projet lié à la R1
  SELECT book_project_id INTO v_r1_book_project_id
  FROM proofreading_v1
  WHERE id = p_proofreading_v1_id
  AND is_deleted = FALSE;
  
  -- Si la R1 n'existe pas, retourner FALSE
  IF v_r1_book_project_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Récupérer le titre du projet
  SELECT title INTO v_project_title
  FROM book_projects
  WHERE id = v_r1_book_project_id
  AND is_deleted = FALSE;
  
  IF v_project_title IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Extraire le nom de base du fichier (sans extension)
  v_file_base_name := SUBSTRING(p_proofreading_file_name FROM '^(.*)\.');
  
  -- Si pas d'extension, utiliser le nom complet
  IF v_file_base_name IS NULL THEN
    v_file_base_name := p_proofreading_file_name;
  END IF;
  
  -- Vérifier que le nom commence par le titre du projet + "_R2"
  -- Ex: "Mon Livre" → "Mon Livre_R2.pdf" ✓
  -- Ex: "Mon Livre" → "Mon Livre_R1_R2.pdf" ✗
  -- Ex: "Mon Livre" → "Autre Nom_R2.pdf" ✗
  v_expected_pattern := v_project_title || '_R2';
  
  IF v_file_base_name = v_expected_pattern THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_proofreading_v2_name IS 'Valide qu''un fichier R2 a pour nom le titre du projet + "_R2" (ex: "Mon Livre" → "Mon Livre_R2.pdf")';


-- ✅ 4. FONCTION: Générer le nom attendu pour un transcrit
CREATE OR REPLACE FUNCTION generate_expected_transcription_name(
  p_raw_file_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_raw_file_name TEXT;
  v_raw_base_name TEXT;
  v_raw_extension TEXT;
BEGIN
  -- Récupérer le nom du fichier brut
  SELECT file_name INTO v_raw_file_name
  FROM raw_files
  WHERE id = p_raw_file_id
  AND is_deleted = FALSE;
  
  -- Si le fichier brut n'existe pas, retourner NULL
  IF v_raw_file_name IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extraire le nom de base
  v_raw_base_name := SUBSTRING(v_raw_file_name FROM '^(.*)\.');
  v_raw_extension := LOWER(SUBSTRING(v_raw_file_name FROM '\.([^\.]+)$'));
  
  -- Si pas d'extension, utiliser le nom complet
  IF v_raw_base_name IS NULL THEN
    v_raw_base_name := v_raw_file_name;
  END IF;
  
  -- Générer le nom attendu avec extension .txt (ou garder l'extension originale si texte)
  -- Ex: "interview_001.mp3" → "interview_001.txt"
  -- Ex: "interview_001.pdf" → "interview_001.txt"
  RETURN v_raw_base_name || '.txt';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_expected_transcription_name IS 'Génère le nom attendu pour un fichier transcrit à partir d''un fichier brut (ex: "interview.mp3" → "interview.txt")';


-- ✅ 5. FONCTION: Générer le nom attendu pour une R1
CREATE OR REPLACE FUNCTION generate_expected_proofreading_v1_name(
  p_book_project_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_project_title TEXT;
BEGIN
  -- Récupérer le titre du projet
  SELECT title INTO v_project_title
  FROM book_projects
  WHERE id = p_book_project_id
  AND is_deleted = FALSE;
  
  -- Si le projet n'existe pas, retourner NULL
  IF v_project_title IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Générer le nom attendu
  -- Ex: "Mon Livre" → "Mon Livre_R1.pdf"
  RETURN v_project_title || '_R1.pdf';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_expected_proofreading_v1_name IS 'Génère le nom attendu pour une relecture 1 à partir d''un projet (ex: "Mon Livre" → "Mon Livre_R1.pdf")';


-- ✅ 6. FONCTION: Générer le nom attendu pour une R2
CREATE OR REPLACE FUNCTION generate_expected_proofreading_v2_name(
  p_proofreading_v1_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_r1_book_project_id UUID;
  v_project_title TEXT;
BEGIN
  -- Récupérer le projet lié à la R1
  SELECT book_project_id INTO v_r1_book_project_id
  FROM proofreading_v1
  WHERE id = p_proofreading_v1_id
  AND is_deleted = FALSE;
  
  -- Si la R1 n'existe pas, retourner NULL
  IF v_r1_book_project_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Récupérer le titre du projet
  SELECT title INTO v_project_title
  FROM book_projects
  WHERE id = v_r1_book_project_id
  AND is_deleted = FALSE;
  
  IF v_project_title IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Générer le nom attendu
  -- Ex: "Mon Livre" → "Mon Livre_R2.pdf"
  RETURN v_project_title || '_R2.pdf';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_expected_proofreading_v2_name IS 'Génère le nom attendu pour une relecture 2 à partir d''une R1 (ex: "Mon Livre" → "Mon Livre_R2.pdf")';


-- ✅ 7. FONCTION: Valider et proposer la correction d'un nom de transcrit
CREATE OR REPLACE FUNCTION validate_and_suggest_transcription_correction(
  p_raw_file_id UUID, 
  p_transcription_file_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_is_valid BOOLEAN;
  v_expected_name TEXT;
  v_raw_file_name TEXT;
BEGIN
  -- Valider le nom
  v_is_valid := validate_transcription_name(p_raw_file_id, p_transcription_file_name);
  
  -- Générer le nom attendu
  v_expected_name := generate_expected_transcription_name(p_raw_file_id);
  
  -- Récupérer le nom du fichier brut
  SELECT file_name INTO v_raw_file_name
  FROM raw_files
  WHERE id = p_raw_file_id
  AND is_deleted = FALSE;
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'provided_name', p_transcription_file_name,
    'raw_file_name', v_raw_file_name,
    'expected_name', v_expected_name,
    'suggestion', CASE 
      WHEN v_is_valid THEN 'Le nom est conforme'
      ELSE 'Voulez-vous renommer en "' || v_expected_name || '" ?'
    END
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_and_suggest_transcription_correction IS 'Valide un nom de transcrit et propose une correction si nécessaire';


-- ✅ 8. FONCTION: Valider et proposer la correction d'un nom de R1
CREATE OR REPLACE FUNCTION validate_and_suggest_proofreading_v1_correction(
  p_book_project_id UUID, 
  p_proofreading_file_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_is_valid BOOLEAN;
  v_expected_name TEXT;
  v_project_title TEXT;
BEGIN
  -- Valider le nom
  v_is_valid := validate_proofreading_v1_name(p_book_project_id, p_proofreading_file_name);
  
  -- Générer le nom attendu
  v_expected_name := generate_expected_proofreading_v1_name(p_book_project_id);
  
  -- Récupérer le titre du projet
  SELECT title INTO v_project_title
  FROM book_projects
  WHERE id = p_book_project_id
  AND is_deleted = FALSE;
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'provided_name', p_proofreading_file_name,
    'project_title', v_project_title,
    'expected_name', v_expected_name,
    'suggestion', CASE 
      WHEN v_is_valid THEN 'Le nom est conforme'
      ELSE 'Voulez-vous renommer en "' || v_expected_name || '" ?'
    END
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_and_suggest_proofreading_v1_correction IS 'Valide un nom de R1 et propose une correction si nécessaire';


-- ✅ 9. FONCTION: Valider et proposer la correction d'un nom de R2
CREATE OR REPLACE FUNCTION validate_and_suggest_proofreading_v2_correction(
  p_proofreading_v1_id UUID, 
  p_proofreading_file_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_is_valid BOOLEAN;
  v_expected_name TEXT;
  v_project_title TEXT;
BEGIN
  -- Valider le nom
  v_is_valid := validate_proofreading_v2_name(p_proofreading_v1_id, p_proofreading_file_name);
  
  -- Générer le nom attendu
  v_expected_name := generate_expected_proofreading_v2_name(p_proofreading_v1_id);
  
  -- Récupérer le titre du projet (via R1)
  SELECT bp.title INTO v_project_title
  FROM proofreading_v1 pr1
  INNER JOIN book_projects bp ON pr1.book_project_id = bp.id
  WHERE pr1.id = p_proofreading_v1_id
  AND pr1.is_deleted = FALSE;
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'provided_name', p_proofreading_file_name,
    'project_title', v_project_title,
    'expected_name', v_expected_name,
    'suggestion', CASE 
      WHEN v_is_valid THEN 'Le nom est conforme'
      ELSE 'Voulez-vous renommer en "' || v_expected_name || '" ?'
    END
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_and_suggest_proofreading_v2_correction IS 'Valide un nom de R2 et propose une correction si nécessaire';


-- ✅ 10. FONCTION: Vérification globale avant import de transcription
CREATE OR REPLACE FUNCTION check_transcription_import_requirements(
  p_transcription_file_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_raw_files JSONB;
  v_matching_raw_files JSONB;
  v_count INTEGER;
BEGIN
  -- Trouver tous les fichiers bruts qui pourraient correspondre
  SELECT jsonb_agg(jsonb_build_object(
    'id', rf.id,
    'file_name', rf.file_name,
    'is_linked', rf.is_linked,
    'status', rf.status,
    'validation', validate_and_suggest_transcription_correction(rf.id, p_transcription_file_name)
  )) INTO v_raw_files
  FROM raw_files rf
  WHERE rf.is_deleted = FALSE
  AND (
    -- Fichiers avec nom de base similaire
    SUBSTRING(rf.file_name FROM '^(.*)\.') = SUBSTRING(p_transcription_file_name FROM '^(.*)\.')
  );
  
  -- Filtrer les correspondances valides
  SELECT jsonb_agg(val) INTO v_matching_raw_files
  FROM jsonb_array_elements(v_raw_files) AS val
  WHERE (val->'validation'->>'is_valid')::BOOLEAN = TRUE;
  
  -- Compter les correspondances
  SELECT jsonb_array_length(COALESCE(v_matching_raw_files, '[]'::jsonb)) INTO v_count;
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'is_valid', v_count > 0,
    'matching_raw_files_count', v_count,
    'matching_raw_files', COALESCE(v_matching_raw_files, '[]'::jsonb),
    'message', CASE 
      WHEN v_count = 0 THEN 'Aucun fichier brut correspondant trouvé'
      WHEN v_count = 1 THEN 'Correspondance trouvée'
      ELSE 'Plusieurs correspondances trouvées - sélectionnez-en une'
    END
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_transcription_import_requirements IS 'Vérifie les requirements avant l''import d''une transcription';


-- =====================================================
-- EXEMPLES D'UTILISATION
-- =====================================================

-- ✅ Valider un nom de transcrit
-- SELECT validate_transcription_name('uuid-brut', 'interview_001.txt');
-- -- Retourne: true si "interview_001.mp3" existe, false sinon

-- ✅ Valider un nom de R1
-- SELECT validate_proofreading_v1_name('uuid-projet', 'Mon Livre_R1.pdf');
-- -- Retourne: true si le projet s'appelle "Mon Livre", false sinon

-- ✅ Valider un nom de R2
-- SELECT validate_proofreading_v2_name('uuid-r1', 'Mon Livre_R2.pdf');
-- -- Retourne: true si le projet lié à R1 s'appelle "Mon Livre", false sinon

-- ✅ Générer un nom attendu
-- SELECT generate_expected_transcription_name('uuid-brut');
-- -- Retourne: "interview_001.txt"

-- ✅ Valider avec suggestion
-- SELECT validate_and_suggest_transcription_correction('uuid-brut', 'mauvais_nom.txt');
-- -- Retourne: {"is_valid": false, "expected_name": "interview_001.txt", "suggestion": "Voulez-vous renommer en ..."}


-- =====================================================
-- RÉSUMÉ DES FONCTIONS CRÉÉES
-- =====================================================
-- 1. validate_transcription_name() - Valide nom transcrit = nom brut
-- 2. validate_proofreading_v1_name() - Valide nom R1 = nom Projet + "_R1"
-- 3. validate_proofreading_v2_name() - Valide nom R2 = nom Projet + "_R2"
-- 4. generate_expected_transcription_name() - Génère nom attendu transcrit
-- 5. generate_expected_proofreading_v1_name() - Génère nom attendu R1
-- 6. generate_expected_proofreading_v2_name() - Génère nom attendu R2
-- 7. validate_and_suggest_transcription_correction() - Valide + suggestion
-- 8. validate_and_suggest_proofreading_v1_correction() - Valide + suggestion
-- 9. validate_and_suggest_proofreading_v2_correction() - Valide + suggestion
-- 10. check_transcription_import_requirements() - Vérification globale import

