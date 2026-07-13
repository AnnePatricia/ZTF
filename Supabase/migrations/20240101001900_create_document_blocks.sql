-- =====================================================
-- MIGRATION 016: Table document_blocks (CŒUR DU SYSTÈME)
-- Description: Table centrale des blocs atomiques pour le correcteur collaboratif
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE document_blocks
-- =====================================================

CREATE TABLE IF NOT EXISTS document_blocks (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Type et position
  type TEXT NOT NULL CHECK (type IN (
    'heading1', 'heading2', 'heading3', 'heading4',
    'paragraph', 'blockquote', 'image', 'footnote',
    'list', 'list_item', 'divider', 'table'
  )),
  position INTEGER NOT NULL,
  
  -- Contenu ProseMirror (JSON)
  content JSONB NOT NULL DEFAULT '{}',
  
  -- Statut éditorial (cycle de vie du bloc)
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'proposed', 'merged', 'rejected')),
  
  -- CRDT — synchronisation temps réel
  crdt_state BYTEA,  -- État Y.js encodé
  vector_clock JSONB DEFAULT '{}',  -- { "user_uuid": version_int }
  
  -- Traçabilité
  created_by UUID REFERENCES users(id),
  merged_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  merged_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Métriques
  word_count INTEGER DEFAULT 0,
  char_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE document_blocks IS '
  BLOCS ATOMIQUES — Cœur du correcteur collaboratif
  
  Chaque paragraphe, titre, image = 1 bloc indépendant avec son propre cycle de vie :
  - draft : contenu original importé, non modifié
  - proposed : modification suggérée, en attente d''approbation
  - merged : approuvé par le chef de projet → version officielle
  - rejected : proposition rejetée, retour au draft précédent
  
  Synchronisation temps réel via CRDT (Y.js) et vector_clock.
';

COMMENT ON COLUMN document_blocks.document_id IS 'Document parent (session de correction)';
COMMENT ON COLUMN document_blocks.type IS 'Type de bloc (paragraph, heading1, image, etc.)';
COMMENT ON COLUMN document_blocks.position IS 'Ordre dans le document (réordonnable)';
COMMENT ON COLUMN document_blocks.content IS 'Contenu ProseMirror (structure TipTap)';
COMMENT ON COLUMN document_blocks.status IS 'Statut éditorial du bloc';
COMMENT ON COLUMN document_blocks.crdt_state IS 'État Y.js encodé pour CRDT';
COMMENT ON COLUMN document_blocks.vector_clock IS 'Horloge vectorielle pour résolution de conflits';

-- =====================================================
-- 3. INDEX CRITIQUES POUR PERFORMANCES
-- =====================================================

-- Index pour récupérer les blocs d'un document dans l'ordre
CREATE INDEX idx_blocks_document_position 
  ON document_blocks(document_id, position);

-- Index pour filtrer par statut
CREATE INDEX idx_blocks_document_status 
  ON document_blocks(document_id, status);

-- Index pour filtrer par type
CREATE INDEX idx_blocks_document_type 
  ON document_blocks(document_id, type);

-- Index pour les requêtes sur le contenu JSONB
CREATE INDEX idx_blocks_content_gin 
  ON document_blocks USING GIN (content jsonb_path_ops);

-- Index pour le tri par date
CREATE INDEX idx_blocks_created_at 
  ON document_blocks(created_at DESC);

-- =====================================================
-- 4. TRIGGER POUR updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_document_blocks_updated_at ON document_blocks;

DROP TRIGGER IF EXISTS update_document_blocks_updated_at ON document_blocks;
CREATE TRIGGER update_document_blocks_updated_at
  BEFORE UPDATE ON document_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour recalculer les positions après réordre
CREATE OR REPLACE FUNCTION reorder_document_blocks(
  p_document_id UUID,
  p_block_ids UUID[]  -- Tableau d'IDs dans le nouvel ordre
) RETURNS void AS $$
BEGIN
  -- Mettre à jour les positions
  UPDATE document_blocks b
  SET position = idx.position
  FROM (
    SELECT unnest(p_block_ids) as id, generate_subscripts(p_block_ids, 1) as position
  ) idx
  WHERE b.id = idx.id AND b.document_id = p_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reorder_document_blocks IS 'Réordonne les blocs d''un document selon un tableau d''IDs';

-- Fonction pour calculer les métriques d'un bloc
CREATE OR REPLACE FUNCTION calculate_block_metrics(
  p_block_id UUID
) RETURNS TABLE (word_count INTEGER, char_count INTEGER) AS $$
DECLARE
  block_content JSONB;
  text_content TEXT;
BEGIN
  -- Récupérer le contenu
  SELECT content INTO block_content
  FROM document_blocks
  WHERE id = p_block_id;
  
  -- Extraire le texte (simplifié)
  SELECT content::text INTO text_content
  FROM document_blocks
  WHERE id = p_block_id;
  
  -- Calculer (simplifié, à améliorer avec une vraie extraction de texte)
  RETURN QUERY SELECT
    LENGTH(COALESCE(text_content, '')) / 5 as word_count,  -- Estimation
    LENGTH(COALESCE(text_content, '')) as char_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_block_metrics IS 'Calcule le nombre de mots et caractères d''un bloc';

-- =====================================================
-- 6. VUE UTILITAIRE
-- =====================================================

-- Vue pour voir les blocs avec leur progression
CREATE OR REPLACE VIEW blocks_progress AS
SELECT
  b.id,
  b.document_id,
  d.title as document_title,
  b.type,
  b.position,
  b.status,
  b.word_count,
  b.char_count,
  b.created_by,
  u.full_name as created_by_name,
  b.merged_by,
  mu.full_name as merged_by_name,
  b.merged_at,
  b.created_at,
  b.updated_at,
  CASE 
    WHEN b.status = 'merged' THEN '✅ Validé'
    WHEN b.status = 'proposed' THEN '🟠 En attente'
    WHEN b.status = 'rejected' THEN '❌ Rejeté'
    ELSE '⬜ Brouillon'
  END as status_label
FROM document_blocks b
LEFT JOIN documents d ON b.document_id = d.id
LEFT JOIN users u ON b.created_by = u.id
LEFT JOIN users mu ON b.merged_by = mu.id
ORDER BY b.document_id, b.position;

COMMENT ON VIEW blocks_progress IS 'Vue des blocs avec leur statut et progression';

-- =====================================================
-- 7. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 016 appliquée avec succès !';
  RAISE NOTICE '   ⭐ Table document_blocks créée (CŒUR DU SYSTÈME)';
  RAISE NOTICE '   - Colonnes : id, document_id, type, position, content, status, crdt_state, vector_clock';
  RAISE NOTICE '   - Index critiques créés';
  RAISE NOTICE '   - Fonction reorder_document_blocks() créée';
  RAISE NOTICE '   - Vue blocks_progress créée';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT * FROM document_blocks LIMIT 5;';
  RAISE NOTICE '   SELECT * FROM blocks_progress LIMIT 5;';
END $$;

