-- =====================================================
-- MIGRATION 021: Table document_sessions
-- Description: Présence live des collaborateurs (curseurs, heartbeat)
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE document_sessions
-- =====================================================

CREATE TABLE IF NOT EXISTS document_sessions (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Position actuelle
  block_id UUID REFERENCES document_blocks(id) ON DELETE SET NULL,  -- Bloc consulté/édité
  cursor_pos INTEGER DEFAULT 0,  -- Position du curseur dans le bloc
  
  -- État de la connexion
  is_online BOOLEAN DEFAULT TRUE,
  is_typing BOOLEAN DEFAULT FALSE,
  
  -- Heartbeat
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_ping_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Curseur (couleur, label)
  cursor_color TEXT DEFAULT '#2563EB',
  cursor_label TEXT,  -- Initiales ou nom court
  
  -- Contrainte d'unicité
  UNIQUE (document_id, user_id)
);

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE document_sessions IS '
  SESSIONS LIVE — Présence en temps réel
  
  Chaque utilisateur connecté à une session a une entrée dans cette table.
  Le heartbeat (last_ping_at) est mis à jour toutes les 30 secondes.
  
  Si last_ping_at > 2 minutes → utilisateur considéré comme déconnecté.
  
  Affichage dans l''UI :
  - Curseurs colorés avec label (initiales)
  - Indicateur "en train d''écrire"
  - Liste des collaborateurs connectés
';

COMMENT ON COLUMN document_sessions.block_id IS 'Bloc actuellement consulté/édité';
COMMENT ON COLUMN document_sessions.cursor_pos IS 'Position du curseur dans le bloc';
COMMENT ON COLUMN document_sessions.is_online IS 'true = connecté, false = déconnecté';
COMMENT ON COLUMN document_sessions.is_typing IS 'true = en train d''écrire';
COMMENT ON COLUMN document_sessions.last_ping_at IS 'Dernier heartbeat (toutes les 30s)';
COMMENT ON COLUMN document_sessions.cursor_color IS 'Couleur du curseur (ex: #2563EB)';
COMMENT ON COLUMN document_sessions.cursor_label IS 'Label du curseur (ex: "AM" pour Aminata)';

-- =====================================================
-- 3. INDEX CRITIQUES POUR PERFORMANCES
-- =====================================================

-- Index pour récupérer qui est en ligne sur un document
CREATE INDEX idx_sessions_document_online 
  ON document_sessions(document_id, is_online)
  WHERE is_online = TRUE;

-- Index pour les sessions actives
CREATE INDEX idx_sessions_active 
  ON document_sessions(document_id, last_ping_at DESC);

-- Index pour les utilisateurs en train d'écrire
CREATE INDEX idx_sessions_typing 
  ON document_sessions(document_id, is_typing)
  WHERE is_typing = TRUE;

-- Index pour le nettoyage des sessions expirées
CREATE INDEX idx_sessions_last_ping 
  ON document_sessions(last_ping_at)
  WHERE is_online = TRUE;

-- =====================================================
-- 4. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour le heartbeat
CREATE OR REPLACE FUNCTION update_session_heartbeat(
  p_document_id UUID,
  p_user_id UUID,
  p_block_id UUID DEFAULT NULL,
  p_cursor_pos INTEGER DEFAULT 0,
  p_is_typing BOOLEAN DEFAULT FALSE
) RETURNS void AS $$
BEGIN
  UPDATE document_sessions
  SET 
    block_id = COALESCE(p_block_id, block_id),
    cursor_pos = p_cursor_pos,
    is_typing = p_is_typing,
    is_online = TRUE,
    last_ping_at = NOW()
  WHERE document_id = p_document_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_session_heartbeat IS 'Met à jour le heartbeat d''une session (toutes les 30s)';

-- Fonction pour marquer comme déconnecté
CREATE OR REPLACE FUNCTION disconnect_session(
  p_document_id UUID,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE document_sessions
  SET 
    is_online = FALSE,
    is_typing = FALSE,
    last_ping_at = NOW()
  WHERE document_id = p_document_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION disconnect_session IS 'Marque une session comme déconnectée';

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_stale_sessions() RETURNS void AS $$
BEGIN
  -- Marquer comme déconnecté les sessions sans heartbeat depuis 2 minutes
  UPDATE document_sessions
  SET is_online = FALSE
  WHERE is_online = TRUE
  AND last_ping_at < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_stale_sessions IS 'Nettoie les sessions expirées (à planifier avec pg_cron)';

-- Fonction pour obtenir les collaborateurs en ligne
CREATE OR REPLACE FUNCTION get_online_collaborators(
  p_document_id UUID
) RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  cursor_color TEXT,
  cursor_label TEXT,
  block_id UUID,
  is_typing BOOLEAN,
  last_ping_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.user_id,
    u.full_name,
    u.email,
    dc.role,
    ds.cursor_color,
    ds.cursor_label,
    ds.block_id,
    ds.is_typing,
    ds.last_ping_at
  FROM document_sessions ds
  LEFT JOIN users u ON ds.user_id = u.id
  LEFT JOIN document_collaborators dc ON ds.document_id = dc.document_id AND ds.user_id = dc.user_id
  WHERE ds.document_id = p_document_id
  AND ds.is_online = TRUE
  AND ds.last_ping_at > NOW() - INTERVAL '2 minutes'
  ORDER BY ds.last_ping_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_online_collaborators IS 'Retourne les collaborateurs en ligne sur un document';

-- =====================================================
-- 5. VUES UTILITAIRES
-- =====================================================

-- Vue pour voir les sessions actives
CREATE OR REPLACE VIEW active_sessions AS
SELECT
  ds.id,
  ds.document_id,
  d.title as document_title,
  ds.user_id,
  u.full_name,
  u.email,
  dc.role,
  ds.cursor_color,
  ds.cursor_label,
  ds.block_id,
  b.type as block_type,
  ds.is_typing,
  ds.is_online,
  ds.connected_at,
  ds.last_ping_at,
  NOW() - ds.last_ping_at as last_activity,
  CASE 
    WHEN ds.last_ping_at > NOW() - INTERVAL '30 seconds' THEN '🟢 En ligne'
    WHEN ds.last_ping_at > NOW() - INTERVAL '2 minutes' THEN '🟡 Inactif'
    ELSE '🔴 Déconnecté'
  END as status
FROM document_sessions ds
LEFT JOIN documents d ON ds.document_id = d.id
LEFT JOIN users u ON ds.user_id = u.id
LEFT JOIN document_collaborators dc ON ds.document_id = dc.document_id AND ds.user_id = dc.user_id
LEFT JOIN document_blocks b ON ds.block_id = b.id
ORDER BY ds.last_ping_at DESC;

COMMENT ON VIEW active_sessions IS 'Sessions actives avec statut de connexion';

-- Vue pour les sessions en cours d'écriture
CREATE OR REPLACE VIEW typing_users AS
SELECT
  ds.document_id,
  d.title as document_title,
  ds.user_id,
  u.full_name,
  ds.cursor_label,
  ds.block_id,
  ds.last_ping_at
FROM document_sessions ds
LEFT JOIN documents d ON ds.document_id = d.id
LEFT JOIN users u ON ds.user_id = u.id
WHERE ds.is_typing = TRUE
AND ds.is_online = TRUE
AND ds.last_ping_at > NOW() - INTERVAL '1 minute'
ORDER BY ds.last_ping_at DESC;

COMMENT ON VIEW typing_users IS 'Utilisateurs en train d''écrire en temps réel';

-- =====================================================
-- 6. TRIGGER POUR NETTOYAGE AUTOMATIQUE
-- =====================================================

-- Trigger pour mettre à jour last_ping_at automatiquement
CREATE OR REPLACE FUNCTION trigger_session_ping() RETURNS TRIGGER AS $$
BEGIN
  NEW.last_ping_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS auto_session_ping ON document_sessions;

CREATE TRIGGER auto_session_ping
  BEFORE UPDATE OF is_typing, cursor_pos, block_id ON document_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_session_ping();

-- =====================================================
-- 7. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 021 appliquée avec succès !';
  RAISE NOTICE '   Table document_sessions créée';
  RAISE NOTICE '   - Colonnes : id, document_id, user_id, block_id, cursor_pos, is_online, is_typing';
  RAISE NOTICE '   - Index critiques créés';
  RAISE NOTICE '   - Fonctions update_session_heartbeat(), get_online_collaborators() créées';
  RAISE NOTICE '   - Vues active_sessions et typing_users créées';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT * FROM document_sessions LIMIT 5;';
  RAISE NOTICE '   SELECT * FROM active_sessions LIMIT 10;';
END $$;

