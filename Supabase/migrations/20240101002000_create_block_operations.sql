-- =====================================================
-- MIGRATION 017: Table block_operations
-- Description: Journal complet de chaque modification (CRDT)
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE block_operations
-- =====================================================

CREATE TABLE IF NOT EXISTS block_operations (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES document_blocks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Type d'opération
  op_type TEXT NOT NULL CHECK (op_type IN (
    'insert',     -- Insertion de texte
    'delete',     -- Suppression de texte
    'style',      -- Changement de style (gras, italique...)
    'move',       -- Déplacement du bloc
    'split',      -- Découpage d'un bloc en deux
    'merge',      -- Fusion de deux blocs
    'image_replace', -- Remplacement d'une image
    'format',     -- Changement de format (H1 → H2, etc.)
    'reorder'     -- Réordonnancement
  )),
  
  -- Données de l'opération (format Y.js / ProseMirror)
  op_data JSONB NOT NULL,
  /*
    Exemples :
    insert : { "from": 12, "text": "bonjour", "marks": [] }
    delete : { "from": 5, "to": 11 }
    style  : { "from": 0, "to": 8, "mark": "bold", "action": "add" }
    move   : { "old_position": 3, "new_position": 7 }
  */
  
  -- Vecteur d'horloge au moment de l'opération
  vector_clock JSONB NOT NULL DEFAULT '{}',
  
  -- Contexte
  session_id UUID,  -- Session de travail (document_sessions)
  is_offline BOOLEAN DEFAULT FALSE,  -- Créé hors ligne, appliqué plus tard
  applied_at TIMESTAMPTZ DEFAULT NOW(),  -- Horodatage précis (ms)
  synced_at TIMESTAMPTZ,  -- Quand synchronisé depuis offline
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE block_operations IS '
  JOURNAL CRDT — Historique complet de chaque modification
  
  Chaque opération est enregistrée avec :
  - Le type d''opération (insert, delete, style, move, etc.)
  - Les données au format Y.js / ProseMirror
  - L''horloge vectorielle pour résolution de conflits
  - Le contexte (session, offline, etc.)
  
  Permet de :
  - Rejouer l''historique à n''importe quel instant
  - Résoudre les conflits d''édition simultanée
  - Synchroniser les modifications offline
';

COMMENT ON COLUMN block_operations.op_type IS 'Type d''opération (insert, delete, style, move, etc.)';
COMMENT ON COLUMN block_operations.op_data IS 'Données de l''opération (format Y.js)';
COMMENT ON COLUMN block_operations.vector_clock IS 'Horloge vectorielle { "user_uuid": version }';
COMMENT ON COLUMN block_operations.is_offline IS 'true = opération créée hors ligne';
COMMENT ON COLUMN block_operations.synced_at IS 'Date de synchronisation (après reconnexion)';

-- =====================================================
-- 3. INDEX CRITIQUES POUR PERFORMANCES
-- =====================================================

-- Index pour rejouer l'historique d'un bloc dans l'ordre
CREATE INDEX idx_ops_block_time 
  ON block_operations(block_id, applied_at);

-- Index pour l'historique d'un document
CREATE INDEX idx_ops_document_time 
  ON block_operations(document_id, applied_at);

-- Index pour les opérations par utilisateur
CREATE INDEX idx_ops_user 
  ON block_operations(user_id, applied_at);

-- Index pour les opérations en attente de sync
CREATE INDEX idx_ops_offline 
  ON block_operations(is_offline, synced_at)
  WHERE is_offline = TRUE;

-- Index pour les opérations récentes (géré par vue matérialisée si besoin)
-- L'index avec NOW() n'est pas immutable, on utilise un index simple
CREATE INDEX idx_ops_document_recent
  ON block_operations(document_id, applied_at DESC);

-- Index GIN pour les recherches dans op_data
CREATE INDEX idx_ops_data_gin 
  ON block_operations USING GIN (op_data jsonb_path_ops);

-- =====================================================
-- 4. TRIGGER POUR NETTOYAGE AUTOMATIQUE
-- =====================================================

-- Fonction pour nettoyer les anciennes opérations
CREATE OR REPLACE FUNCTION cleanup_old_block_operations() RETURNS void AS $$
BEGIN
  -- Supprimer les opérations de plus de 90 jours
  -- quand un snapshot de version existe pour ce document
  DELETE FROM block_operations
  WHERE applied_at < NOW() - INTERVAL '90 days'
  AND document_id IN (
    SELECT DISTINCT document_id 
    FROM document_versions
    WHERE blocks_snapshot IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_block_operations IS 'Nettoie les opérations anciennes (à planifier avec pg_cron)';

-- =====================================================
-- 5. VUE UTILITAIRE
-- =====================================================

-- Vue pour voir l'historique des opérations
CREATE OR REPLACE VIEW operations_history AS
SELECT
  o.id,
  o.block_id,
  b.type as block_type,
  o.document_id,
  d.title as document_title,
  o.user_id,
  u.full_name as user_name,
  o.op_type,
  o.op_data,
  o.vector_clock,
  o.is_offline,
  o.applied_at,
  o.synced_at,
  o.created_at,
  CASE 
    WHEN o.is_offline AND o.synced_at IS NULL THEN '📡 En attente de sync'
    WHEN o.is_offline THEN '✅ Sync'
    ELSE '🟢 En ligne'
  END as sync_status
FROM block_operations o
LEFT JOIN document_blocks b ON o.block_id = b.id
LEFT JOIN documents d ON o.document_id = d.id
LEFT JOIN users u ON o.user_id = u.id
ORDER BY o.applied_at DESC
LIMIT 1000;

COMMENT ON VIEW operations_history IS 'Vue des 1000 dernières opérations avec détails';

-- Vue pour les opérations en attente de sync
CREATE OR REPLACE VIEW pending_offline_operations AS
SELECT
  o.id,
  o.block_id,
  o.document_id,
  o.user_id,
  u.full_name as user_name,
  o.op_type,
  o.applied_at,
  NOW() - o.applied_at as wait_duration
FROM block_operations o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.is_offline = TRUE AND o.synced_at IS NULL
ORDER BY o.applied_at ASC;

COMMENT ON VIEW pending_offline_operations IS 'Opérations hors ligne en attente de synchronisation';

-- =====================================================
-- 6. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 017 appliquée avec succès !';
  RAISE NOTICE '   Table block_operations créée (Journal CRDT)';
  RAISE NOTICE '   - Colonnes : id, block_id, document_id, user_id, op_type, op_data, vector_clock';
  RAISE NOTICE '   - Index critiques créés';
  RAISE NOTICE '   - Fonction cleanup_old_block_operations() créée';
  RAISE NOTICE '   - Vues operations_history et pending_offline_operations créées';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT * FROM block_operations LIMIT 5;';
  RAISE NOTICE '   SELECT * FROM operations_history LIMIT 10;';
END $$;

