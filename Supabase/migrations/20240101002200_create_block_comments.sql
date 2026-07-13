-- =====================================================
-- MIGRATION 019: Table block_comments
-- Description: Commentaires ancrés sur un bloc précis
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE block_comments
-- =====================================================

CREATE TABLE IF NOT EXISTS block_comments (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES document_blocks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  parent_id UUID REFERENCES block_comments(id),  -- NULL = commentaire racine, sinon = réponse
  
  -- Ancrage dans le texte
  anchor_text TEXT,       -- Texte sur lequel le commentaire est ancré
  anchor_start INTEGER,   -- Position caractère de début
  anchor_end INTEGER,     -- Position caractère de fin
  
  -- Contenu
  content TEXT NOT NULL,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE block_comments IS '
  COMMENTAIRES ANCRÉS
  
  Les commentaires peuvent être :
  - Ancrés à une position précise dans le texte (anchor_start, anchor_end)
  - En thread (parent_id pour les réponses)
  - Résolus (status = resolved)
  
  Tous les collaborateurs peuvent commenter, même les reviewer.
';

COMMENT ON COLUMN block_comments.anchor_text IS 'Extrait de texte sur lequel le commentaire est ancré';
COMMENT ON COLUMN block_comments.anchor_start IS 'Position de début de l''ancre dans le bloc';
COMMENT ON COLUMN block_comments.anchor_end IS 'Position de fin de l''ancre dans le bloc';
COMMENT ON COLUMN block_comments.parent_id IS 'ID du commentaire parent (pour les threads)';
COMMENT ON COLUMN block_comments.status IS 'open = ouvert, resolved = résolu';

-- =====================================================
-- 3. INDEX CRITIQUES POUR PERFORMANCES
-- =====================================================

-- Index pour récupérer les commentaires d'un bloc
CREATE INDEX idx_comments_block_status 
  ON block_comments(block_id, status);

-- Index pour les commentaires d'un document
CREATE INDEX idx_comments_document_status 
  ON block_comments(document_id, status);

-- Index pour les threads (réponses)
CREATE INDEX idx_comments_thread 
  ON block_comments(parent_id)
  WHERE parent_id IS NOT NULL;

-- Index pour les commentaires ouverts
CREATE INDEX idx_comments_open 
  ON block_comments(document_id, created_at DESC)
  WHERE status = 'open';

-- Index pour les commentaires par utilisateur
CREATE INDEX idx_comments_user 
  ON block_comments(user_id, created_at DESC);

-- =====================================================
-- 4. TRIGGER POUR updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_block_comments_updated_at ON block_comments;

DROP TRIGGER IF EXISTS update_block_comments_updated_at ON block_comments;
CREATE TRIGGER update_block_comments_updated_at
  BEFORE UPDATE ON block_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour résoudre un commentaire
CREATE OR REPLACE FUNCTION resolve_block_comment(
  p_comment_id UUID,
  p_resolver_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE block_comments
  SET 
    status = 'resolved',
    resolved_by = p_resolver_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_comment_id AND status = 'open';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_block_comment IS 'Résout un commentaire (marque comme résolu)';

-- Fonction pour compter les commentaires non résolus
CREATE OR REPLACE FUNCTION count_unresolved_comments(
  p_document_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM block_comments
    WHERE document_id = p_document_id AND status = 'open'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION count_unresolved_comments IS 'Compte le nombre de commentaires non résolus dans un document';

-- =====================================================
-- 6. VUES UTILITAIRES
-- =====================================================

-- Vue pour voir les commentaires non résolus
CREATE OR REPLACE VIEW unresolved_comments AS
SELECT
  c.id,
  c.block_id,
  b.type as block_type,
  b.position as block_position,
  c.document_id,
  d.title as document_title,
  c.user_id,
  u.full_name as user_name,
  c.anchor_text,
  c.content,
  c.created_at,
  NOW() - c.created_at as age
FROM block_comments c
LEFT JOIN document_blocks b ON c.block_id = b.id
LEFT JOIN documents d ON c.document_id = d.id
LEFT JOIN users u ON c.user_id = u.id
WHERE c.status = 'open'
ORDER BY c.created_at DESC;

COMMENT ON VIEW unresolved_comments IS 'Commentaires non résolus avec détails';

-- Vue pour les threads de commentaires
CREATE OR REPLACE VIEW comment_threads AS
SELECT
  c.id,
  c.parent_id,
  c.block_id,
  c.document_id,
  c.user_id,
  u.full_name as user_name,
  c.content,
  c.status,
  c.created_at,
  CASE 
    WHEN c.parent_id IS NULL THEN '📝 Commentaire'
    ELSE '↳ Réponse'
  END as comment_type
FROM block_comments c
LEFT JOIN users u ON c.user_id = u.id
ORDER BY c.block_id, c.created_at;

COMMENT ON VIEW comment_threads IS 'Threads de commentaires (racines + réponses)';

-- =====================================================
-- 7. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 019 appliquée avec succès !';
  RAISE NOTICE '   Table block_comments créée';
  RAISE NOTICE '   - Colonnes : id, block_id, document_id, user_id, parent_id, anchor_text, content, status';
  RAISE NOTICE '   - Index critiques créés';
  RAISE NOTICE '   - Fonction resolve_block_comment() créée';
  RAISE NOTICE '   - Vues unresolved_comments et comment_threads créées';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT * FROM block_comments LIMIT 5;';
  RAISE NOTICE '   SELECT * FROM unresolved_comments LIMIT 10;';
END $$;

