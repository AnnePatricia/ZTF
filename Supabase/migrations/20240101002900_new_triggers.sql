-- =====================================================
-- MIGRATION 026: Triggers d'automatisation
-- Description: Triggers pour automatiser les flux du correcteur
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. TRIGGER : notify_on_proposal()
-- =====================================================

-- Créer une notification quand une proposition est soumise
CREATE OR REPLACE FUNCTION notify_on_proposal() RETURNS TRIGGER AS $$
DECLARE
  v_document_owner UUID;
  v_document_title TEXT;
BEGIN
  -- Récupérer le owner du document
  SELECT user_id, title INTO v_document_owner, v_document_title
  FROM documents
  WHERE id = NEW.document_id;
  
  -- Créer une notification pour le owner
  IF v_document_owner IS NOT NULL AND v_document_owner != NEW.proposed_by THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      document_id,
      block_id,
      data
    ) VALUES (
      v_document_owner,
      'new_proposal',
      'Nouvelle proposition de modification',
      'Une nouvelle proposition a été soumise sur ' || v_document_title,
      NEW.document_id,
      NEW.block_id,
      jsonb_build_object(
        'proposal_id', NEW.id,
        'proposed_by', NEW.proposed_by,
        'diff_summary', NEW.diff_summary
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_proposal ON block_proposals;
CREATE TRIGGER trigger_notify_on_proposal
  AFTER INSERT ON block_proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_proposal();

COMMENT ON FUNCTION notify_on_proposal IS 'Crée une notification quand une proposition est soumise';


-- =====================================================
-- 2. TRIGGER : notify_on_comment()
-- =====================================================

-- Créer une notification quand un commentaire est ajouté
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
  v_document_owner UUID;
  v_block_owner UUID;
  v_document_title TEXT;
BEGIN
  -- Récupérer le owner du document
  SELECT user_id, title INTO v_document_owner, v_document_title
  FROM documents
  WHERE id = NEW.document_id;
  
  -- Récupérer le owner du bloc (si merged)
  SELECT merged_by INTO v_block_owner
  FROM document_blocks
  WHERE id = NEW.block_id;
  
  -- Notification pour le owner du document
  IF v_document_owner IS NOT NULL AND v_document_owner != NEW.user_id THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      document_id,
      block_id,
      data
    ) VALUES (
      v_document_owner,
      'new_comment',
      'Nouveau commentaire',
      'Un commentaire a été ajouté sur ' || v_document_title,
      NEW.document_id,
      NEW.block_id,
      jsonb_build_object(
        'comment_id', NEW.id,
        'user_id', NEW.user_id,
        'anchor_text', NEW.anchor_text
      )
    );
  END IF;
  
  -- Notification pour le owner du bloc (si différent)
  IF v_block_owner IS NOT NULL AND v_block_owner != NEW.user_id AND v_block_owner != v_document_owner THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      document_id,
      block_id,
      data
    ) VALUES (
      v_block_owner,
      'new_comment',
      'Nouveau commentaire sur votre bloc',
      'Un commentaire a été ajouté sur un bloc que vous avez mergé.',
      NEW.document_id,
      NEW.block_id,
      jsonb_build_object(
        'comment_id', NEW.id,
        'user_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_comment ON block_comments;
CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON block_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

COMMENT ON FUNCTION notify_on_comment IS 'Crée une notification quand un commentaire est ajouté';


-- =====================================================
-- 3. TRIGGER : update_document_metrics()
-- =====================================================

-- Mettre à jour les métriques du document quand un bloc change
CREATE OR REPLACE FUNCTION update_document_metrics() RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour total_blocks et merged_blocks
  UPDATE documents
  SET 
    total_blocks = (
      SELECT COUNT(*) FROM document_blocks WHERE document_id = NEW.document_id
    ),
    merged_blocks = (
      SELECT COUNT(*) FROM document_blocks 
      WHERE document_id = NEW.document_id AND status = 'merged'
    ),
    updated_at = NOW()
  WHERE id = NEW.document_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_metrics_insert ON document_blocks;
CREATE TRIGGER trigger_update_document_metrics_insert
  AFTER INSERT ON document_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_document_metrics();

CREATE TRIGGER trigger_update_document_metrics_update
  AFTER UPDATE OF status ON document_blocks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_document_metrics();

DROP TRIGGER IF EXISTS trigger_update_document_metrics_delete ON document_blocks;
CREATE TRIGGER trigger_update_document_metrics_delete
  AFTER DELETE ON document_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_document_metrics();

COMMENT ON FUNCTION update_document_metrics IS 'Met à jour les métriques du document (total_blocks, merged_blocks)';


-- =====================================================
-- 4. TRIGGER : auto_version_on_session_close()
-- =====================================================

-- Créer un snapshot automatique quand une session est clôturée
CREATE OR REPLACE FUNCTION auto_version_on_session_close() RETURNS TRIGGER AS $$
BEGIN
  -- Si le document passe à "completed", créer un snapshot
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM create_auto_document_version(NEW.id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_version_on_session_close ON documents;
CREATE TRIGGER trigger_auto_version_on_session_close
  AFTER UPDATE ON documents
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION auto_version_on_session_close();

COMMENT ON FUNCTION auto_version_on_session_close IS 'Crée un snapshot automatique quand une session est clôturée';


-- =====================================================
-- 5. TRIGGER : update_collaborator_joined()
-- =====================================================

-- Mettre à jour joined_at quand un collaborateur se connecte
CREATE OR REPLACE FUNCTION update_collaborator_joined() RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est la première session, mettre à jour joined_at
  IF NEW.joined_at IS NULL THEN
    UPDATE document_collaborators
    SET joined_at = NOW()
    WHERE document_id = NEW.document_id AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_collaborator_joined ON document_sessions;
CREATE TRIGGER trigger_update_collaborator_joined
  AFTER INSERT ON document_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_collaborator_joined();

COMMENT ON FUNCTION update_collaborator_joined IS 'Met à jour joined_at du collaborateur à la première connexion';


-- =====================================================
-- 6. TRIGGER : notify_on_session_invite()
-- =====================================================

-- Créer une notification quand un collaborateur est invité
CREATE OR REPLACE FUNCTION notify_on_session_invite() RETURNS TRIGGER AS $$
DECLARE
  v_document_title TEXT;
BEGIN
  -- Récupérer le titre du document
  SELECT title INTO v_document_title
  FROM documents
  WHERE id = NEW.document_id;
  
  -- Créer une notification pour l'invité
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    document_id,
    data
  ) VALUES (
    NEW.user_id,
    'session_invite',
    'Invitation à une session de correction',
    'Vous avez été invité à participer à la session : ' || v_document_title,
    NEW.document_id,
    jsonb_build_object(
      'role', NEW.role,
      'invited_by', NEW.invited_by
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_session_invite ON document_collaborators;

DROP TRIGGER IF EXISTS trigger_notify_on_session_invite ON document_collaborators;
CREATE TRIGGER trigger_notify_on_session_invite
  AFTER INSERT ON document_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_session_invite();

COMMENT ON FUNCTION notify_on_session_invite IS 'Crée une notification quand un collaborateur est invité';


-- =====================================================
-- 7. TRIGGER : update_updated_at_column()
-- =====================================================

-- Trigger générique pour updated_at (déjà existant, mais on le recrée si besoin)
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer aux tables qui n'ont pas encore le trigger
DO $$
BEGIN
  -- document_blocks (déjà fait dans migration 016)
  -- block_proposals (déjà fait dans migration 018)
  -- block_comments (déjà fait dans migration 019)
  
  -- Ajouter aux autres tables si besoin
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_document_collaborators_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_document_collaborators_updated_at ON document_collaborators;
CREATE TRIGGER update_document_collaborators_updated_at
      BEFORE UPDATE ON document_collaborators
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_notifications_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =====================================================
-- 8. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 026 appliquee avec succes !';
  RAISE NOTICE 'Triggers crees : notify_on_proposal, notify_on_comment, update_document_metrics, auto_version_on_session_close, update_collaborator_joined, notify_on_session_invite';
END $$;

