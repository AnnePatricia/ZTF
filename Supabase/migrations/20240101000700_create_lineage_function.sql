-- =====================================================
-- MIGRATION 007: Fonction get_raw_file_lineage
-- Description: Retourne toute la lignée éditoriale d'un fichier brut
-- Adaptée pour utiliser les tables de relations existantes
-- =====================================================

-- ✅ SUPPRIMER L'ANCIENNE FONCTION SI ELLE EXISTE
DROP FUNCTION IF EXISTS get_raw_file_lineage(UUID);

-- ✅ CRÉER LA NOUVELLE FONCTION
CREATE OR REPLACE FUNCTION get_raw_file_lineage(p_raw_file_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- ✅ 1. FICHIER BRUT
    'raw_file', jsonb_build_object(
      'id', rf.id,
      'file_name', rf.file_name,
      'file_type', rf.file_type,
      'file_size', rf.file_size,
      'status', rf.status,
      'is_linked', rf.is_linked,
      'linked_documents_count', rf.linked_documents_count,
      'imported_by', rf.imported_by,
      'imported_at', rf.imported_at,
      'created_at', rf.created_at
    ),
    
    -- ✅ 2. TRANSCRIPTIONS LIÉES (via transcription_raw_files)
    'transcriptions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'status', t.status,
        'workflow_step', t.workflow_step,
        'progress', t.progress,
        'assigned_to', t.assigned_to,
        'created_by', t.created_by,
        'created_at', t.created_at,
        'updated_at', t.updated_at
      ) ORDER BY t.created_at ASC)
      FROM transcriptions t
      INNER JOIN transcription_raw_files trf 
        ON t.id = trf.transcription_id
      WHERE trf.raw_file_id = p_raw_file_id
      AND t.is_deleted = false
    ), '[]'::jsonb),
    
    -- ✅ 3. PROJETS DE LIVRE (via transcription_raw_files → book_project_transcriptions)
    -- NOTE: DISTINCT est nécessaire car un projet peut avoir plusieurs transcriptions liées au même brut
    'book_projects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', bp.id,
        'title', bp.title,
        'status', bp.status,
        'workflow_step', bp.workflow_step,
        'progress', bp.progress,
        'author', bp.author,
        'assigned_to', bp.assigned_to,
        'created_by', bp.created_by,
        'created_at', bp.created_at,
        'updated_at', bp.updated_at
      ) ORDER BY bp.created_at ASC)
      FROM (
        SELECT DISTINCT bp2.id, bp2.title, bp2.status, bp2.workflow_step, 
               bp2.progress, bp2.author, bp2.assigned_to, bp2.created_by,
               bp2.created_at, bp2.updated_at
        FROM book_projects bp2
        INNER JOIN book_project_transcriptions bpt 
          ON bp2.id = bpt.book_project_id
        INNER JOIN transcription_raw_files trf 
          ON bpt.transcription_id = trf.transcription_id
        WHERE trf.raw_file_id = p_raw_file_id
        AND bp2.is_deleted = false
        ORDER BY bp2.created_at ASC
      ) bp
    ), '[]'::jsonb),
    
    -- ✅ 4. RELECTURE 1 (via book_project_transcriptions → proofreading_v1)
    'proofreading_v1', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr1.id,
        'status', pr1.status,
        'workflow_step', pr1.workflow_step,
        'progress', pr1.progress,
        'reviewer_id', pr1.reviewer_id,
        'reviewer_name', pr1.reviewer_name,
        'notes', pr1.notes,
        'corrections_count', pr1.corrections_count,
        'created_at', pr1.created_at,
        'updated_at', pr1.updated_at,
        'book_project_id', pr1.book_project_id
      ) ORDER BY pr1.created_at ASC)
      FROM proofreading_v1 pr1
      INNER JOIN book_projects bp 
        ON pr1.book_project_id = bp.id
      INNER JOIN book_project_transcriptions bpt 
        ON bp.id = bpt.book_project_id
      INNER JOIN transcription_raw_files trf 
        ON bpt.transcription_id = trf.transcription_id
      WHERE trf.raw_file_id = p_raw_file_id
      AND pr1.is_deleted = false
    ), '[]'::jsonb),
    
    -- ✅ 5. RELECTURE 2 (via proofreading_v1 → proofreading_v2)
    'proofreading_v2', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr2.id,
        'status', pr2.status,
        'workflow_step', pr2.workflow_step,
        'progress', pr2.progress,
        'reviewer_id', pr2.reviewer_id,
        'reviewer_name', pr2.reviewer_name,
        'notes', pr2.notes,
        'corrections_count', pr2.corrections_count,
        'created_at', pr2.created_at,
        'updated_at', pr2.updated_at,
        'proofreading_v1_id', pr2.proofreading_v1_id
      ) ORDER BY pr2.created_at ASC)
      FROM proofreading_v2 pr2
      INNER JOIN proofreading_v1 pr1 
        ON pr2.proofreading_v1_id = pr1.id
      INNER JOIN book_projects bp 
        ON pr1.book_project_id = bp.id
      INNER JOIN book_project_transcriptions bpt 
        ON bp.id = bpt.book_project_id
      INNER JOIN transcription_raw_files trf 
        ON bpt.transcription_id = trf.transcription_id
      WHERE trf.raw_file_id = p_raw_file_id
      AND pr2.is_deleted = false
    ), '[]'::jsonb),
    
    -- ✅ 6. DOCUMENTS LIÉS (via document_media_links)
    'linked_documents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', dml.document_id,
        'title', d.title,
        'status', d.status,
        'workflow_step', d.workflow_step,
        'progress', d.progress,
        'assigned_to', d.assigned_to,
        'media_status', dml.media_status,
        'document_status', dml.document_status,
        'linked_at', dml.linked_at
      ) ORDER BY dml.linked_at ASC)
      FROM document_media_links dml
      INNER JOIN documents d 
        ON dml.document_id = d.id
      WHERE dml.media_file_id = p_raw_file_id
    ), '[]'::jsonb),
    
    -- ✅ 7. PROGRESSION GLOBALE (0-100%)
    'global_progress', (
      SELECT COALESCE(MAX(
        CASE 
          -- ✅ Relecture 2 validée = 100%
          WHEN pr2.id IS NOT NULL AND pr2.status = 'relecture_2_validé' THEN 100
          -- ✅ Relecture 2 en cours = 90%
          WHEN pr2.id IS NOT NULL THEN 90
          -- ✅ Relecture 1 validée (sans R2) = 80%
          WHEN pr1.status = 'relecture_1_validé' AND pr2.id IS NULL THEN 80
          -- ✅ Relecture 1 en cours = 60%
          WHEN pr1.id IS NOT NULL AND pr1.status = 'relecture_1_en_cours' THEN 60
          -- ✅ Relecture 1 (autre statut) = 70%
          WHEN pr1.id IS NOT NULL THEN 70
          -- ✅ Projet de livre = 50%
          WHEN bp.id IS NOT NULL AND bp.status = 'projet_de_livre' THEN 50
          -- ✅ Transcrit = 30%
          WHEN t.id IS NOT NULL AND t.status = 'transcrit' THEN 30
          -- ✅ Transcription en cours = 15%
          WHEN t.id IS NOT NULL AND t.status = 'transcription_en_cours' THEN 15
          -- ✅ Transcription (autre statut) = 20%
          WHEN t.id IS NOT NULL THEN 20
          -- ✅ Document lié (sans transcription) = 10%
          WHEN dml.document_id IS NOT NULL THEN 10
          -- ✅ Fichier brut seul = 0%
          ELSE 0
        END
      ), 0)
      FROM transcriptions t
      INNER JOIN transcription_raw_files trf ON t.id = trf.transcription_id
      LEFT JOIN book_project_transcriptions bpt ON t.id = bpt.transcription_id
      LEFT JOIN book_projects bp ON bpt.book_project_id = bp.id
      LEFT JOIN proofreading_v1 pr1 ON bp.id = pr1.book_project_id
      LEFT JOIN proofreading_v2 pr2 ON pr1.id = pr2.proofreading_v1_id
      LEFT JOIN document_media_links dml ON trf.raw_file_id = dml.media_file_id
      WHERE trf.raw_file_id = p_raw_file_id
    )
  ) INTO result
  FROM raw_files rf
  WHERE rf.id = p_raw_file_id
  AND rf.is_deleted = false;
  
  -- ✅ SI LE FICHIER N'EXISTE PAS, RETOURNER NULL
  IF result IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ✅ COMMENTAIRE
COMMENT ON FUNCTION get_raw_file_lineage IS 'Retourne toute la lignée éditoriale d''un fichier brut: brut → transcriptions → projets → relectures → documents';

-- ✅ GRANT D'UTILISATION
GRANT EXECUTE ON FUNCTION get_raw_file_lineage TO authenticated;

-- ✅ EXEMPLE D'UTILISATION
-- SELECT get_raw_file_lineage('votre-uuid-ici');

