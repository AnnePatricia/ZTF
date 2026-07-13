-- =====================================================
-- MIGRATION 022: Table notifications
-- Description: Alertes envoyées aux utilisateurs
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  block_id UUID REFERENCES document_blocks(id) ON DELETE SET NULL,
  
  -- Type de notification
  type TEXT NOT NULL
    CHECK (type IN (
      'new_proposal',      -- Nouvelle proposition soumise
      'proposal_approved', -- Votre proposition a été approuvée
      'proposal_rejected', -- Votre proposition a été rejetée
      'new_comment',       -- Nouveau commentaire sur un bloc
      'comment_reply',     -- Réponse à votre commentaire
      'session_invite',    -- Invitation à rejoindre une session
      'session_closed',    -- Session clôturée
      'mention',           -- Vous avez été mentionné
      'sync_complete',     -- Synchronisation offline complète
      'welcome'            -- Bienvenue sur la plateforme
    )),
  
  -- Contenu
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',  -- Données additionnelles contextuelles
  
  -- État
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE notifications IS '
  NOTIFICATIONS UTILISATEUR
  
  Types de notifications :
  - new_proposal : "Kouam a propose une modification sur p03"
  - proposal_approved : "Votre proposition a ete approuvee"
  - proposal_rejected : "Votre proposition a ete rejetee"
  - new_comment : "Aminata a commente p05"
  - comment_reply : "Doriane a repondu a votre commentaire"
  - session_invite : "Vous avez ete invite a la session Chapitre 3"
  - session_closed : "La session Chapitre 3 est cloturee"
  - mention : "Vous avez ete mentionne dans un commentaire"
  - sync_complete : "Synchronisation terminee (3 ops)"
  - welcome : "Bienvenue sur BCM-GEST !"
  
  Les notifications sont marquees comme lues quand l utilisateur les consulte.
';

COMMENT ON COLUMN notifications.data IS 'Données contextuelles (ex: { "proposal_id": "uuid", "block_position": 3 })';
COMMENT ON COLUMN notifications.is_read IS 'true = notification lue';

-- =====================================================
-- 3. INDEX CRITIQUES POUR PERFORMANCES
-- =====================================================

-- Index pour récupérer les notifications non lues
CREATE INDEX idx_notifs_user_unread 
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- Index pour toutes les notifications d'un utilisateur
CREATE INDEX idx_notifs_user 
  ON notifications(user_id, created_at DESC);

-- Index pour les notifications par document
CREATE INDEX idx_notifs_document 
  ON notifications(document_id, created_at DESC);

-- Index pour les notifications non lues (compteur rapide)
CREATE INDEX idx_notifs_unread_count 
  ON notifications(user_id)
  WHERE is_read = FALSE;

-- Index GIN pour les recherches dans data
CREATE INDEX idx_notifs_data_gin 
  ON notifications USING GIN (data jsonb_path_ops);

-- =====================================================
-- 4. TRIGGER POUR updated_at
-- =====================================================

-- Trigger pour marquer comme lu
CREATE OR REPLACE FUNCTION mark_notification_read() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_mark_notification_read ON notifications;

DROP TRIGGER IF EXISTS auto_mark_notification_read ON notifications;
CREATE TRIGGER auto_mark_notification_read
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  WHEN (NEW.is_read = TRUE AND OLD.is_read = FALSE)
  EXECUTE FUNCTION mark_notification_read();

-- =====================================================
-- 5. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_document_id UUID DEFAULT NULL,
  p_block_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    document_id,
    block_id,
    data
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_document_id,
    p_block_id,
    p_data
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_notification IS 'Crée une notification pour un utilisateur';

-- Fonction pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Marque toutes les notifications comme lues';

-- Fonction pour compter les notifications non lues
CREATE OR REPLACE FUNCTION count_unread_notifications(
  p_user_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = p_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION count_unread_notifications IS 'Compte le nombre de notifications non lues';

-- Fonction pour nettoyer les anciennes notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications() RETURNS void AS $$
BEGIN
  -- Supprimer les notifications lues de plus de 30 jours
  DELETE FROM notifications
  WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '30 days';
  
  -- Supprimer les notifications non lues de plus de 90 jours
  DELETE FROM notifications
  WHERE is_read = FALSE
  AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Nettoie les anciennes notifications (à planifier avec pg_cron)';

-- =====================================================
-- 6. VUES UTILITAIRES
-- =====================================================

-- Vue pour les notifications non lues
CREATE OR REPLACE VIEW unread_notifications AS
SELECT
  n.id,
  n.user_id,
  u.email as user_email,
  u.full_name as user_name,
  n.type,
  n.title,
  n.body,
  n.document_id,
  d.title as document_title,
  n.block_id,
  n.data,
  n.created_at,
  NOW() - n.created_at as age
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
LEFT JOIN documents d ON n.document_id = d.id
WHERE n.is_read = FALSE
ORDER BY n.created_at DESC;

COMMENT ON VIEW unread_notifications IS 'Notifications non lues avec détails';

-- Vue pour l'historique des notifications
CREATE OR REPLACE VIEW notifications_history AS
SELECT
  n.id,
  n.user_id,
  u.full_name as user_name,
  n.type,
  n.title,
  n.body,
  n.is_read,
  n.read_at,
  n.created_at,
  CASE 
    WHEN n.is_read THEN '✅ Lue'
    ELSE '🔴 Non lue'
  END as status
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 500;

COMMENT ON VIEW notifications_history IS 'Historique des 500 dernières notifications';

-- Vue pour le compteur de notifications non lues par utilisateur
CREATE OR REPLACE VIEW unread_notifications_count AS
SELECT
  user_id,
  COUNT(*) as unread_count
FROM notifications
WHERE is_read = FALSE
GROUP BY user_id;

COMMENT ON VIEW unread_notifications_count IS 'Compteur de notifications non lues par utilisateur';

-- =====================================================
-- 7. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 022 appliquée avec succès !';
  RAISE NOTICE '   Table notifications créée';
  RAISE NOTICE '   - Colonnes : id, user_id, type, title, body, is_read';
  RAISE NOTICE '   - Index critiques créés';
  RAISE NOTICE '   - Fonctions create_notification(), mark_all_notifications_read() créées';
  RAISE NOTICE '   - Vues unread_notifications, notifications_history créées';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT * FROM notifications LIMIT 5;';
  RAISE NOTICE '   SELECT * FROM unread_notifications LIMIT 10;';
END $$;

