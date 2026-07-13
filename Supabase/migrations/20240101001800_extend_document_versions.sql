-- =====================================================
-- MIGRATION 015: Extension document_versions (blocks_snapshot)
-- Description: Ajoute un snapshot JSONB des blocs pour les versions
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. AJOUTER LA COLONNE blocks_snapshot
-- =====================================================

ALTER TABLE document_versions
  ADD COLUMN IF NOT EXISTS blocks_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS is_auto BOOLEAN DEFAULT FALSE;

-- Commentaires
COMMENT ON COLUMN document_versions.blocks_snapshot IS '
  Snapshot de tous les blocs à un instant T.
  Format : [
    {
      "block_id": "uuid",
      "position": 1,
      "type": "paragraph",
      "content": {...},
      "status": "merged"
    },
    ...
  ]
';

COMMENT ON COLUMN document_versions.is_auto IS 'true = snapshot automatique (toutes les 10 min), false = manuel';

-- =====================================================
-- 2. METTRE À JOUR LES COLONNES EXISTANTES
-- =====================================================

-- Rendre version_number NOT NULL (si ce n'est pas déjà fait)
ALTER TABLE document_versions ALTER COLUMN version_number SET NOT NULL;

-- =====================================================
-- 3. INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_document_versions_document_created 
  ON document_versions(document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_is_auto 
  ON document_versions(document_id, is_auto);

-- Index GIN pour les requêtes JSONB
CREATE INDEX IF NOT EXISTS idx_document_versions_blocks_snapshot_gin
  ON document_versions USING GIN (blocks_snapshot jsonb_path_ops)
  WHERE blocks_snapshot IS NOT NULL;

-- =====================================================
-- 4. FONCTION UTILITAIRE
-- =====================================================

-- Fonction pour créer un snapshot automatique
CREATE OR REPLACE FUNCTION create_auto_document_version(
  p_document_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  new_version_id UUID;
  next_version_number INTEGER;
  blocks_data JSONB;
BEGIN
  -- Calculer le prochain numéro de version
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version_number
  FROM document_versions
  WHERE document_id = p_document_id;

  -- Récupérer les blocs (si la table existe)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'document_blocks'
  ) THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'block_id', b.id,
        'position', b.position,
        'type', b.type,
        'content', b.content,
        'status', b.status
      ) ORDER BY b.position
    ) INTO blocks_data
    FROM document_blocks b
    WHERE b.document_id = p_document_id;
  ELSE
    blocks_data := '[]'::jsonb;
  END IF;

  -- Créer la version
  INSERT INTO document_versions (
    document_id,
    version_number,
    blocks_snapshot,
    is_auto,
    created_by
  ) VALUES (
    p_document_id,
    next_version_number,
    blocks_data,
    TRUE,
    p_user_id
  ) RETURNING id INTO new_version_id;

  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_auto_document_version IS 'Crée un snapshot automatique d''un document avec ses blocs';

-- =====================================================
-- 5. NETTOYAGE AUTOMATIQUE (pg_cron)
-- =====================================================

-- Fonction pour supprimer les snapshots automatiques anciens
CREATE OR REPLACE FUNCTION cleanup_old_auto_versions() RETURNS void AS $$
BEGIN
  -- Supprimer les snapshots automatiques de plus de 30 jours
  -- en gardant au moins 10 versions par document
  DELETE FROM document_versions
  WHERE is_auto = TRUE
  AND created_at < NOW() - INTERVAL '30 days'
  AND document_id IN (
    SELECT document_id
    FROM document_versions
    GROUP BY document_id
    HAVING COUNT(*) > 10
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_auto_versions IS 'Nettoie les versions automatiques anciennes (à planifier avec pg_cron)';

-- =====================================================
-- 6. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 015 appliquée avec succès !';
  RAISE NOTICE '   - Colonnes blocks_snapshot et is_auto ajoutées à document_versions';
  RAISE NOTICE '   - Fonction create_auto_document_version() créée';
  RAISE NOTICE '   - Fonction cleanup_old_auto_versions() créée';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT document_id, version_number, is_auto, created_at FROM document_versions LIMIT 5;';
END $$;

