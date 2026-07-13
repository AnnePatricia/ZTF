-- =====================================================
-- MIGRATION 020: Table document_collaborators
-- Description: Utilisateurs invités à participer à une session de correction
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. CRÉER LA TABLE document_collaborators
-- =====================================================

CREATE TABLE IF NOT EXISTS document_collaborators (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Rôle dans la session
  role TEXT NOT NULL
    CHECK (role IN ('editor', 'redacteur_chef', 'corrector', 'reviewer')),
  
  -- Invitation
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,  -- Première connexion à la session
  
  -- Couleur unique du curseur (pour le temps réel)
  color TEXT NOT NULL DEFAULT '#2563EB',
  
  -- Permissions spécifiques à la session
  permissions JSONB DEFAULT '{
    "can_propose": true,
    "can_comment": true,
    "can_merge": false,
    "can_close_session": false
  }'::jsonb,
  
  -- Contrainte d'unicité
  UNIQUE (document_id, user_id)
);

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================

COMMENT ON TABLE document_collaborators IS '
  COLLABORATEURS D''UNE SESSION
  
  Chaque utilisateur invité à une session de correction a :
  - Un rôle (editor, redacteur_chef, corrector, reviewer)
  - Une couleur de curseur unique
  - Des permissions spécifiques
  
  Permissions :
  - can_propose : peut proposer des modifications
  - can_comment : peut commenter
  - can_merge : peut approuver/rejeter les propositions
  - can_close_session : peut clore la session
';

COMMENT ON COLUMN document_collaborators.role IS 'Rôle dans la session (différent du role dans users)';
COMMENT ON COLUMN document_collaborators.color IS 'Couleur du curseur pour le temps réel (ex: #2563EB)';
COMMENT ON COLUMN document_collaborators.permissions IS 'Permissions JSONB spécifiques à la session';

-- =====================================================
-- 3. INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX idx_collaborators_document 
  ON document_collaborators(document_id);

CREATE INDEX idx_collaborators_user 
  ON document_collaborators(user_id);

CREATE INDEX idx_collaborators_document_role 
  ON document_collaborators(document_id, role);

-- Index pour les utilisateurs actifs
CREATE INDEX idx_collaborators_joined 
  ON document_collaborators(document_id, joined_at)
  WHERE joined_at IS NOT NULL;

-- =====================================================
-- 4. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour inviter un collaborateur
CREATE OR REPLACE FUNCTION invite_collaborator(
  p_document_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_invited_by UUID,
  p_color TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_collaborator_id UUID;
  v_permissions JSONB;
BEGIN
  -- Définir les permissions par rôle
  CASE p_role
    WHEN 'editor' THEN
      v_permissions := '{"can_propose": true, "can_comment": true, "can_merge": true, "can_close_session": true}';
    WHEN 'redacteur_chef' THEN
      v_permissions := '{"can_propose": true, "can_comment": true, "can_merge": true, "can_close_session": false}';
    WHEN 'corrector' THEN
      v_permissions := '{"can_propose": true, "can_comment": true, "can_merge": false, "can_close_session": false}';
    WHEN 'reviewer' THEN
      v_permissions := '{"can_propose": false, "can_comment": true, "can_merge": false, "can_close_session": false}';
    ELSE
      v_permissions := '{"can_propose": false, "can_comment": true, "can_merge": false, "can_close_session": false}';
  END CASE;
  
  -- Générer une couleur si non fournie
  IF p_color IS NULL THEN
    -- Couleurs prédéfinies par rôle
    CASE p_role
      WHEN 'editor' THEN p_color := '#2563EB';  -- Bleu
      WHEN 'redacteur_chef' THEN p_color := '#7C3AED';  -- Violet
      WHEN 'corrector' THEN p_color := '#059669';  -- Vert
      WHEN 'reviewer' THEN p_color := '#6B7280';  -- Gris
    END CASE;
  END IF;
  
  -- Insérer le collaborateur
  INSERT INTO document_collaborators (
    document_id,
    user_id,
    role,
    invited_by,
    color,
    permissions
  ) VALUES (
    p_document_id,
    p_user_id,
    p_role,
    p_invited_by,
    p_color,
    v_permissions
  ) RETURNING id INTO v_collaborator_id;
  
  RETURN v_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION invite_collaborator IS 'Invite un utilisateur à une session de correction';

-- Fonction pour rejoindre une session
CREATE OR REPLACE FUNCTION join_session(
  p_document_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE document_collaborators
  SET joined_at = NOW()
  WHERE document_id = p_document_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION join_session IS 'Marque qu''un utilisateur a rejoint la session';

-- Fonction pour vérifier les permissions
CREATE OR REPLACE FUNCTION collaborator_has_permission(
  p_document_id UUID,
  p_user_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  SELECT permissions INTO v_permissions
  FROM document_collaborators
  WHERE document_id = p_document_id AND user_id = p_user_id;
  
  IF v_permissions IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (v_permissions->>p_permission)::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION collaborator_has_permission IS 'Vérifie si un collaborateur a une permission';

-- =====================================================
-- 5. VUES UTILITAIRES
-- =====================================================

-- Vue pour voir les collaborateurs d'une session
CREATE OR REPLACE VIEW session_collaborators AS
SELECT
  dc.id,
  dc.document_id,
  d.title as document_title,
  dc.user_id,
  u.email,
  u.full_name,
  dc.role,
  dc.color,
  dc.invited_by,
  iu.full_name as invited_by_name,
  dc.invited_at,
  dc.joined_at,
  dc.permissions,
  CASE 
    WHEN dc.joined_at IS NOT NULL THEN '✅ Actif'
    ELSE '⏳ En attente'
  END as status
FROM document_collaborators dc
LEFT JOIN documents d ON dc.document_id = d.id
LEFT JOIN users u ON dc.user_id = u.id
LEFT JOIN users iu ON dc.invited_by = iu.id
ORDER BY dc.joined_at DESC NULLS LAST;

COMMENT ON VIEW session_collaborators IS 'Collaborateurs d''une session avec statut';

-- Vue pour les collaborateurs actifs
CREATE OR REPLACE VIEW active_collaborators AS
SELECT
  dc.document_id,
  dc.user_id,
  u.full_name,
  dc.role,
  dc.color,
  dc.joined_at
FROM document_collaborators dc
LEFT JOIN users u ON dc.user_id = u.id
WHERE dc.joined_at IS NOT NULL
ORDER BY dc.document_id, dc.joined_at;

COMMENT ON VIEW active_collaborators IS 'Collaborateurs ayant rejoint leur session';

-- =====================================================
-- 6. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 020 appliquée avec succès !';
  RAISE NOTICE '   Table document_collaborators créée';
  RAISE NOTICE '   - Colonnes : id, document_id, user_id, role, color, permissions';
  RAISE NOTICE '   - Index critiques créés';
  RAISE NOTICE '   - Fonctions invite_collaborator(), join_session(), collaborator_has_permission() créées';
  RAISE NOTICE '   - Vues session_collaborators et active_collaborators créées';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT * FROM document_collaborators LIMIT 5;';
  RAISE NOTICE '   SELECT * FROM session_collaborators LIMIT 10;';
END $$;

