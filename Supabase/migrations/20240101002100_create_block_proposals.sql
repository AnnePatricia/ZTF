-- =====================================================
-- MIGRATION 018: Table block_proposals
-- Description: Les modifications "Proposed" soumises par les relecteurs
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE block_proposals
-- =====================================================

CREATE TABLE IF NOT EXISTS block_proposals (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES document_blocks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES users(id),
  
  -- Contenu avant et après
  content_before JSONB NOT NULL,  -- État du bloc avant la proposition
  content_after JSONB NOT NULL,   -- État proposé
  diff_summary TEXT,              -- Résumé lisible ex: "ressemble → ressemblait"
  
  -- Justification du relecteur
  justification TEXT,
  
  -- Statut de la proposition
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  -- 'superseded' = une autre proposition plus récente l'a remplacée
  
  -- Décision du chef de projet
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,  -- Motif du rejet ou commentaire d'approbation
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE block_proposals IS '
  PROPOSITIONS DE MODIFICATION
  
  Quand un correcteur (role=corrector) modifie un bloc :
  1. La modification est enregistrée comme "proposition"
  2. Un rédacteur (role=redacteur_chef) peut approuver ou rejeter
  3. Si approuvé → le bloc passe en status="merged"
  4. Si rejeté → le bloc retourne à status="draft"
  
  Statuts :
  - pending : en attente d''approbation
  - approved : approuvé et mergé
  - rejected : rejeté
  - superseded : remplacé par une proposition plus récente
';

COMMENT ON COLUMN block_proposals.content_before IS 'État du bloc avant la proposition (JSON ProseMirror)';
COMMENT ON COLUMN block_proposals.content_after IS 'État proposé (JSON ProseMirror)';
COMMENT ON COLUMN block_proposals.diff_summary IS 'Résumé lisible des changements';
COMMENT ON COLUMN block_proposals.justification IS 'Justification du relecteur';
COMMENT ON COLUMN block_proposals.status IS 'Statut de la proposition';

-- =====================================================
-- 3. INDEX CRITIQUES POUR PERFORMANCES
-- =====================================================

-- Index pour récupérer les propositions en attente d'un document
CREATE INDEX idx_proposals_document_status 
  ON block_proposals(document_id, status);

-- Index pour les propositions par bloc
CREATE INDEX idx_proposals_block_status 
  ON block_proposals(block_id, status);

-- Index pour les propositions par utilisateur
CREATE INDEX idx_proposals_proposed_by 
  ON block_proposals(proposed_by, created_at DESC);

-- Index pour les propositions en attente
CREATE INDEX idx_proposals_pending 
  ON block_proposals(document_id, created_at ASC)
  WHERE status = 'pending';

-- Index GIN pour les recherches dans le contenu
CREATE INDEX idx_proposals_content_before_gin 
  ON block_proposals USING GIN (content_before jsonb_path_ops);

CREATE INDEX idx_proposals_content_after_gin 
  ON block_proposals USING GIN (content_after jsonb_path_ops);

-- =====================================================
-- 4. TRIGGER POUR updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_block_proposals_updated_at ON block_proposals;

DROP TRIGGER IF EXISTS update_block_proposals_updated_at ON block_proposals;
CREATE TRIGGER update_block_proposals_updated_at
  BEFORE UPDATE ON block_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour approuver une proposition
CREATE OR REPLACE FUNCTION approve_block_proposal(
  p_proposal_id UUID,
  p_reviewer_id UUID,
  p_review_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_block_id UUID;
  v_content_after JSONB;
  v_document_id UUID;
BEGIN
  -- Récupérer les infos de la proposition
  SELECT block_id, content_after, document_id 
  INTO v_block_id, v_content_after, v_document_id
  FROM block_proposals
  WHERE id = p_proposal_id AND status = 'pending';
  
  IF v_block_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Mettre à jour le bloc
  UPDATE document_blocks
  SET 
    content = v_content_after,
    status = 'merged',
    merged_by = p_reviewer_id,
    merged_at = NOW(),
    updated_at = NOW()
  WHERE id = v_block_id;
  
  -- Mettre à jour la proposition
  UPDATE block_proposals
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    review_comment = p_review_comment,
    updated_at = NOW()
  WHERE id = p_proposal_id;
  
  -- Incrémenter le compteur de blocs mergés
  UPDATE documents
  SET merged_blocks = merged_blocks + 1
  WHERE id = v_document_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_block_proposal IS 'Approuve une proposition et merge le bloc';

-- Fonction pour rejeter une proposition
CREATE OR REPLACE FUNCTION reject_block_proposal(
  p_proposal_id UUID,
  p_reviewer_id UUID,
  p_review_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Mettre à jour la proposition
  UPDATE block_proposals
  SET 
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    review_comment = p_review_comment,
    updated_at = NOW()
  WHERE id = p_proposal_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_block_proposal IS 'Rejette une proposition';

-- =====================================================
-- 6. VUES UTILITAIRES
-- =====================================================

-- Vue pour voir les propositions en attente
CREATE OR REPLACE VIEW pending_proposals AS
SELECT
  p.id,
  p.block_id,
  b.type as block_type,
  b.position as block_position,
  p.document_id,
  d.title as document_title,
  p.proposed_by,
  u.full_name as proposed_by_name,
  p.diff_summary,
  p.justification,
  p.content_before,
  p.content_after,
  p.created_at,
  NOW() - p.created_at as waiting_duration
FROM block_proposals p
LEFT JOIN document_blocks b ON p.block_id = b.id
LEFT JOIN documents d ON p.document_id = d.id
LEFT JOIN users u ON p.proposed_by = u.id
WHERE p.status = 'pending'
ORDER BY p.created_at ASC;

COMMENT ON VIEW pending_proposals IS 'Propositions en attente d''approbation';

-- Vue pour l'historique des propositions
CREATE OR REPLACE VIEW proposals_history AS
SELECT
  p.id,
  p.block_id,
  p.document_id,
  d.title as document_title,
  p.proposed_by,
  u.full_name as proposed_by_name,
  p.diff_summary,
  p.status,
  p.reviewed_by,
  ru.full_name as reviewed_by_name,
  p.review_comment,
  p.created_at,
  p.reviewed_at
FROM block_proposals p
LEFT JOIN documents d ON p.document_id = d.id
LEFT JOIN users u ON p.proposed_by = u.id
LEFT JOIN users ru ON p.reviewed_by = ru.id
ORDER BY p.created_at DESC
LIMIT 500;

COMMENT ON VIEW proposals_history IS 'Historique des 500 dernières propositions';

-- =====================================================
-- 7. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 018 appliquée avec succès !';
  RAISE NOTICE '   Table block_proposals créée';
  RAISE NOTICE '   - Colonnes : id, block_id, document_id, proposed_by, content_before, content_after, status';
  RAISE NOTICE '   - Index critiques créés';
  RAISE NOTICE '   - Fonctions approve_block_proposal() et reject_block_proposal() créées';
  RAISE NOTICE '   - Vues pending_proposals et proposals_history créées';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT * FROM block_proposals LIMIT 5;';
  RAISE NOTICE '   SELECT * FROM pending_proposals LIMIT 10;';
END $$;

