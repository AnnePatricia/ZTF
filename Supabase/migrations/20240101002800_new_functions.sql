-- =====================================================
-- MIGRATION 025: Fonctions utilitaires supplémentaires
-- Description: Fonctions PostgreSQL pour le correcteur collaboratif
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. FONCTION : merge_block()
-- =====================================================

-- Fusionner un bloc (approuver une proposition)
CREATE OR REPLACE FUNCTION merge_block(
  p_block_id UUID,
  p_proposal_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_document_id UUID;
  v_content_after JSONB;
BEGIN
  -- Récupérer les infos de la proposition
  SELECT document_id, content_after 
  INTO v_document_id, v_content_after
  FROM block_proposals
  WHERE id = p_proposal_id AND status = 'pending';
  
  IF v_document_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Mettre à jour le bloc
  UPDATE document_blocks
  SET 
    content = v_content_after,
    status = 'merged',
    merged_by = p_user_id,
    merged_at = NOW(),
    updated_at = NOW()
  WHERE id = p_block_id;
  
  -- Mettre à jour la proposition
  UPDATE block_proposals
  SET 
    status = 'approved',
    reviewed_by = p_user_id,
    reviewed_at = NOW(),
    review_comment = 'Approuvé et mergé'
  WHERE id = p_proposal_id;
  
  -- Incrémenter le compteur de blocs mergés
  UPDATE documents
  SET 
    merged_blocks = merged_blocks + 1,
    updated_at = NOW()
  WHERE id = v_document_id;
  
  -- Créer une notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    document_id,
    block_id,
    data
  )
  SELECT
    proposed_by,
    'proposal_approved',
    'Votre proposition a été approuvée',
    'Votre modification sur le bloc ' || p_block_id::text || ' a été mergée.',
    v_document_id,
    p_block_id,
    jsonb_build_object('proposal_id', p_proposal_id)
  FROM block_proposals
  WHERE id = p_proposal_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION merge_block IS 'Approuve une proposition et merge le bloc (créé par approve_block_proposal)';


-- =====================================================
-- 2. FONCTION : get_document_progress()
-- =====================================================

-- Calculer la progression globale d'un document
CREATE OR REPLACE FUNCTION get_document_progress(
  p_document_id UUID
) RETURNS TABLE (
  total_blocks INTEGER,
  merged_blocks INTEGER,
  proposed_blocks INTEGER,
  draft_blocks INTEGER,
  rejected_blocks INTEGER,
  progress_pct NUMERIC,
  comments_open INTEGER,
  proposals_pending INTEGER
) AS $$
BEGIN
  -- Si la table document_blocks n'existe pas, retourner des zéros
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'document_blocks'
  ) THEN
    RETURN QUERY SELECT 
      0, 0, 0, 0, 0, 0::NUMERIC, 0, 0;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_blocks,
    COUNT(*) FILTER (WHERE status = 'merged')::INTEGER AS merged_blocks,
    COUNT(*) FILTER (WHERE status = 'proposed')::INTEGER AS proposed_blocks,
    COUNT(*) FILTER (WHERE status = 'draft')::INTEGER AS draft_blocks,
    COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS rejected_blocks,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'merged') * 100.0 / NULLIF(COUNT(*), 0),
      1
    ) AS progress_pct,
    (
      SELECT COUNT(*) FROM block_comments 
      WHERE document_id = p_document_id AND status = 'open'
    ) AS comments_open,
    (
      SELECT COUNT(*) FROM block_proposals 
      WHERE document_id = p_document_id AND status = 'pending'
    ) AS proposals_pending
  FROM document_blocks
  WHERE document_id = p_document_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_document_progress IS 'Calcule la progression globale d''un document (blocs, commentaires, propositions)';


-- =====================================================
-- 3. FONCTION : get_block_history()
-- =====================================================

-- Obtenir l'historique complet d'un bloc
CREATE OR REPLACE FUNCTION get_block_history(
  p_block_id UUID
) RETURNS TABLE (
  operation_id UUID,
  op_type TEXT,
  op_data JSONB,
  user_id UUID,
  user_name TEXT,
  applied_at TIMESTAMPTZ,
  vector_clock JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.op_type,
    o.op_data,
    o.user_id,
    u.full_name,
    o.applied_at,
    o.vector_clock
  FROM block_operations o
  LEFT JOIN users u ON o.user_id = u.id
  WHERE o.block_id = p_block_id
  ORDER BY o.applied_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_block_history IS 'Retourne l''historique complet des opérations sur un bloc';


-- =====================================================
-- 4. FONCTION : compare_blocks()
-- =====================================================

-- Comparer deux états d'un bloc
CREATE OR REPLACE FUNCTION compare_blocks(
  p_block_id UUID,
  p_version1 JSONB,
  p_version2 JSONB
) RETURNS JSONB AS $$
DECLARE
  v_diff JSONB;
BEGIN
  -- Comparaison simplifiée (à améliorer avec un vrai algorithme de diff)
  SELECT jsonb_build_object(
    'block_id', p_block_id,
    'version1', p_version1,
    'version2', p_version2,
    'has_changes', p_version1 IS DISTINCT FROM p_version2,
    'version1_text', p_version1->>'content',
    'version2_text', p_version2->>'content'
  ) INTO v_diff;
  
  RETURN v_diff;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compare_blocks IS 'Compare deux versions d''un bloc';


-- =====================================================
-- 5. FONCTION : cleanup_old_data()
-- =====================================================

-- Nettoyage global des anciennes données
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Nettoyer les opérations anciennes
  PERFORM cleanup_old_block_operations();
  
  -- Nettoyer les notifications anciennes
  PERFORM cleanup_old_notifications();
  
  -- Nettoyer les sessions expirées
  PERFORM cleanup_stale_sessions();
  
  -- Nettoyer les versions automatiques anciennes
  PERFORM cleanup_old_auto_versions();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_data IS 'Lance tous les nettoyages automatiques';


-- =====================================================
-- 6. FONCTION : get_user_stats()
-- =====================================================

-- Statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_stats(
  p_user_id UUID
) RETURNS TABLE (
  proposals_submitted BIGINT,
  proposals_approved BIGINT,
  proposals_rejected BIGINT,
  comments_made BIGINT,
  blocks_merged BIGINT,
  sessions_joined BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM block_proposals WHERE proposed_by = p_user_id) AS proposals_submitted,
    (SELECT COUNT(*) FROM block_proposals WHERE proposed_by = p_user_id AND status = 'approved') AS proposals_approved,
    (SELECT COUNT(*) FROM block_proposals WHERE proposed_by = p_user_id AND status = 'rejected') AS proposals_rejected,
    (SELECT COUNT(*) FROM block_comments WHERE user_id = p_user_id) AS comments_made,
    (SELECT COUNT(*) FROM document_blocks WHERE merged_by = p_user_id) AS blocks_merged,
    (SELECT COUNT(*) FROM document_collaborators WHERE user_id = p_user_id AND joined_at IS NOT NULL) AS sessions_joined;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_stats IS 'Statistiques d''activité d''un utilisateur';


-- =====================================================
-- 7. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 025 appliquée avec succès !';
  RAISE NOTICE '   Fonctions utilitaires créées :';
  RAISE NOTICE '   - merge_block() : Approuve une proposition';
  RAISE NOTICE '   - get_document_progress() : Progression globale';
  RAISE NOTICE '   - get_block_history() : Historique d''un bloc';
  RAISE NOTICE '   - compare_blocks() : Comparer deux versions';
  RAISE NOTICE '   - cleanup_old_data() : Nettoyage global';
  RAISE NOTICE '   - get_user_stats() : Statistiques utilisateur';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour tester :';
  RAISE NOTICE '   SELECT * FROM get_document_progress(''<uuid>'');';
  RAISE NOTICE '   SELECT * FROM get_user_stats(''<uuid>'');';
END $$;

