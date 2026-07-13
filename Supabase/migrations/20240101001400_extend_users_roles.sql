-- =====================================================
-- MIGRATION 011: Extension des rôles utilisateurs
-- Description: Ajoute timezone, preferred_lang + 3 nouveaux rôles
--              pour le correcteur collaboratif
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. NOUVELLES COLONNES (sans casser l'existant)
-- =====================================================

-- Ajout de timezone et langue préférée
-- Ces colonnes sont optionnelles et ont des valeurs par défaut
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Douala',
  ADD COLUMN IF NOT EXISTS preferred_lang TEXT DEFAULT 'fr';

-- Commentaire sur ces nouvelles colonnes
COMMENT ON COLUMN users.timezone IS 'Fuseau horaire de l''utilisateur (ex: Africa/Douala, Europe/Paris)';
COMMENT ON COLUMN users.preferred_lang IS 'Langue préférée de l''interface (ex: fr, en)';


-- =====================================================
-- 2. NETTOYAGE DES DONNÉES EXISTANTES (CRITIQUE)
-- =====================================================

-- IMPORTANT : Les nouveaux rôles (redacteur_chef, corrector, reviewer)
-- sont UNIQUEMENT pour le correcteur collaboratif.
-- Ils ne remplacent PAS les rôles fonctionnels du workflow existant.

-- Les utilisateurs existants gardent leurs permissions (can_import, can_transcribe, etc.)
-- Le rôle dans users.role est juste une "étiquette" pour le correcteur collaboratif.

-- On nettoie seulement les rôles qui ne sont pas dans la nouvelle liste
-- En les passant à 'user' (rôle de base)

UPDATE users
SET role = CASE
  -- Les rôles existants valides restent inchangés
  WHEN role IN ('user', 'editor', 'admin') THEN role
  
  -- Tous les autres rôles (fonctionnels du workflow) → 'user'
  -- Ils gardent leurs permissions pour le workflow existant
  -- Ex: 'Transcripteur', 'Relecteur', 'Éditeur', etc. → 'user'
  -- Mais can_import, can_transcribe, can_review restent vrais si cochés
  ELSE 'user'
END
WHERE role NOT IN ('user', 'editor', 'admin', 'redacteur_chef', 'corrector', 'reviewer');

-- NOTE EXPLICATIVE :
-- Un utilisateur avec role='user' peut toujours :
-- - Importer des fichiers (si can_import = true)
-- - Transcrire (si can_transcribe = true)
-- - Relire R1/R2 (si can_review = true)
-- - Créer des projets (si can_edit = true)
-- 
-- Le rôle 'user' n'est pas limitant pour le workflow existant.
-- Il sert juste de défaut pour le correcteur collaboratif.


-- =====================================================
-- 3. EXTENSION DE LA CONTRAINTE CHECK DES RÔLES
-- =====================================================

-- Supprimer l'ancienne contrainte (si elle existe)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Ajouter la nouvelle contrainte avec les 6 rôles
-- Les 3 premiers sont les rôles existants
-- Les 3 nouveaux sont UNIQUEMENT pour le correcteur collaboratif
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    -- Rôles existants (déjà utilisés)
    'user',    -- Utilisateur de base
    'editor',  -- Chef de projet éditorial
    'admin',   -- Administrateur plateforme
    
    -- NOUVEAUX rôles (correcteur collaboratif SEULEMENT)
    'redacteur_chef',  -- Rédacteur en chef (peut merger les propositions)
    'corrector',       -- Correcteur (peut proposer des modifications)
    'reviewer'         -- Relecteur (lecture seule, commentaires uniquement)
  ));

-- NOTE : Cette contrainte n'affecte PAS le workflow existant.
-- Les permissions can_import, can_transcribe, can_review, etc. restent indépendantes.

COMMENT ON COLUMN users.role IS '
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    DEUX SYSTÈMES DE RÔLES COEXISTENT                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  A. RÔLES TECHNIQUES (correcteur collaboratif) :                              ║
║     Ce sont les valeurs de users.role                                         ║
║                                                                               ║
║     - admin          : Super-utilisateur, tous droits                         ║
║     - editor         : Chef de projet, peut clore les sessions de correction  ║
║     - redacteur_chef : Peut merger les propositions (approuver/rejeter)       ║
║     - corrector      : Peut proposer des modifications (pas merger)           ║
║     - reviewer       : Lecture seule, commentaires uniquement                 ║
║     - user           : Rôle de base (workflow existant)                       ║
║                                                                               ║
║  B. RÔLES FONCTIONNELS (workflow existant) :                                  ║
║     Ce ne sont PAS des valeurs de users.role                                  ║
║     Ce sont des "casquettes" qu''un utilisateur endosse selon ses actions :   ║
║                                                                               ║
║     - Transcripteur    : Importe raw_files, crée transcriptions               ║
║                        → Contrôlé par can_import, can_transcribe              ║
║     - Créateur projet  : Crée book_projects                                   ║
║                        → Contrôlé par can_edit                                ║
║     - Relecteur 1      : Assigné à proofreading_v1                            ║
║     - Relecteur 2      : Assigné à proofreading_v2                            ║
║                        → Contrôlé par can_review                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
';


-- =====================================================
-- 4. INDEX POUR PERFORMANCES
-- =====================================================

-- Index sur le rôle (pour filtrer par rôle)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index sur l'email (pour recherche)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- NOTE : La colonne is_active n'existe pas dans le schéma actuel
-- Si tu veux l'ajouter, décommente la migration 011-bis


-- =====================================================
-- 5. MIGRATION DES DONNÉES EXISTANTES (RÉCAPITULATIF)
-- =====================================================

-- Le nettoyage a été fait à l'étape 2 AVANT la contrainte
-- Cette section est maintenant informative

/*
  ╔═══════════════════════════════════════════════════════════════════════════════╗
  ║  RÔLES TECHNIQUES vs RÔLES FONCTIONNELS - SÉPARATION TOTALE                   ║
  ╠═══════════════════════════════════════════════════════════════════════════════╣
  
  ANCIEN WORKFLOW (intouchable) :
  ───────────────────────────────
  Transcripteur, Relecteur, Créateur projet → Permissions (can_import, etc.)
  
  Les utilisateurs gardent leurs permissions :
  - can_import : peut importer raw_files
  - can_transcribe : peut créer transcriptions
  - can_review : peut relire proofreading_v1/v2
  - can_edit : peut créer book_projects
  - etc.
  
  NOUVEAU CORRECTEUR (greffé sur proofreading_v2) :
  ────────────────────────────────────────────────
  Rôles techniques dans users.role :
  - admin, editor : peuvent merger + clore sessions
  - redacteur_chef : peut merger (pas clore)
  - corrector : peut proposer (pas merger)
  - reviewer : commentaires seulement
  - user : rôle par défaut
  
  CONVERSION APPLIQUÉE :
  ──────────────────────
  'Transcripteur', 'Relecteur', 'Éditeur', etc. → 'user'
  'user', 'editor', 'admin' → inchangés
  
  MAIS les permissions restent intactes !
  Un 'Transcripteur' devenu 'user' peut toujours transcrire
  si can_transcribe = true.
*/


-- =====================================================
-- 6. VUE UTILITAIRE : UTILISATEURS ACTIFS AVEC RÔLES
-- =====================================================

-- Il faut DROP la vue existante avant de la recréer avec les nouvelles colonnes
DROP VIEW IF EXISTS active_users CASCADE;

-- Crée la vue avec les nouvelles colonnes (timezone, preferred_lang)
CREATE VIEW active_users AS
SELECT
  id,
  email,
  full_name,
  role,
  timezone,
  preferred_lang,
  avatar_url,
  department,
  team,
  can_import,
  can_transcribe,
  can_review,
  can_edit,
  can_delete,
  can_manage_users,
  created_at
FROM users
WHERE id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL);

COMMENT ON VIEW active_users IS 'Liste des utilisateurs actifs avec email confirmé (inclut timezone et preferred_lang)';


-- =====================================================
-- 7. FONCTION UTILITAIRE : VÉRIFIER LES PERMISSIONS
-- =====================================================

-- Fonction pour vérifier si un utilisateur a une permission spécifique
-- Cette fonction sépare clairement :
-- 1. Les permissions du workflow existant (basées sur les booléens)
-- 2. Les permissions du correcteur collaboratif (basées sur le rôle)

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  can_do BOOLEAN;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM users WHERE id = p_user_id;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier la permission demandée
  CASE p_permission
    -- ═══════════════════════════════════════════════════════════════
    -- PERMISSIONS DU WORKFLOW EXISTANT (basées sur les booléens)
    -- Ces permissions sont INDÉPENDANTES du rôle technique
    -- ═══════════════════════════════════════════════════════════════
    
    -- Permission: importer des fichiers
    WHEN 'import_files' THEN
      SELECT can_import INTO can_do FROM users WHERE id = p_user_id;
      RETURN COALESCE(can_do, FALSE);
    
    -- Permission: transcrire
    WHEN 'transcribe' THEN
      SELECT can_transcribe INTO can_do FROM users WHERE id = p_user_id;
      RETURN COALESCE(can_do, FALSE);
    
    -- Permission: relire (workflow existant)
    WHEN 'review' THEN
      SELECT can_review INTO can_do FROM users WHERE id = p_user_id;
      RETURN COALESCE(can_do, FALSE);
    
    -- Permission: éditer/créer projets
    WHEN 'edit' THEN
      SELECT can_edit INTO can_do FROM users WHERE id = p_user_id;
      RETURN COALESCE(can_do, FALSE);
    
    -- Permission: supprimer
    WHEN 'delete' THEN
      SELECT can_delete INTO can_do FROM users WHERE id = p_user_id;
      RETURN COALESCE(can_do, FALSE);
    
    -- Permission: gérer les utilisateurs
    WHEN 'manage_users' THEN
      SELECT can_manage_users INTO can_do FROM users WHERE id = p_user_id;
      RETURN COALESCE(can_do, FALSE);
    
    -- ═══════════════════════════════════════════════════════════════
    -- PERMISSIONS DU CORRECTEUR COLLABORATIF (basées sur le rôle)
    -- Ces permissions sont LIÉES au rôle technique (users.role)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Permission: merger les propositions (approuver/rejeter)
    -- Réservé à : admin, editor, redacteur_chef
    WHEN 'merge_blocks' THEN
      RETURN user_role IN ('admin', 'editor', 'redacteur_chef');
    
    -- Permission: proposer des modifications
    -- Ouvert à : admin, editor, redacteur_chef, corrector
    WHEN 'propose_modification' THEN
      RETURN user_role IN ('admin', 'editor', 'redacteur_chef', 'corrector');
    
    -- Permission: commenter
    -- Ouvert à : admin, editor, redacteur_chef, corrector, reviewer
    WHEN 'comment' THEN
      RETURN user_role IN ('admin', 'editor', 'redacteur_chef', 'corrector', 'reviewer');
    
    -- Permission: clore une session de correction
    -- Réservé à : admin, editor uniquement
    WHEN 'close_session' THEN
      RETURN user_role IN ('admin', 'editor');
    
    -- Permission: éditer directement (mode édition libre)
    -- Réservé à : admin, editor, redacteur_chef
    WHEN 'edit_directly' THEN
      RETURN user_role IN ('admin', 'editor', 'redacteur_chef');
    
    -- Permission par défaut
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_permission IS '
  Vérifie si un utilisateur a une permission spécifique.
  
  DEUX SYSTÈMES SÉPARÉS :
  
  1. Workflow existant (import_files, transcribe, review, etc.)
     → Basé sur les colonnes booléennes (can_import, can_transcribe, etc.)
     → INDÉPENDANT du rôle technique
  
  2. Correcteur collaboratif (merge_blocks, propose_modification, etc.)
     → Basé sur le rôle technique (users.role)
     → admin, editor, redacteur_chef, corrector, reviewer
';


-- =====================================================
-- 8. TABLEAU DES PERMISSIONS PAR RÔLE
-- =====================================================

-- Cette section est documentaire (dans les commentaires)
-- Pour une implémentation physique, voir: document_collaborators.permissions (JSONB)

/*
╔════════════════════════════════════════════════════════════════════════════════╗
║                    MATRICE DES PERMISSIONS - DEUX SYSTÈMES                     ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  A. WORKFLOW EXISTANT (permissions booléennes - INDÉPENDANTES du rôle)        ║
║  ──────────────────────────────────────────────────────────────────────────    ║
║                                                                                ║
║  Permission    │ admin │ editor │ redacteur_chef │ corrector │ reviewer │ user ║
║  ──────────────┼───────┼────────┼────────────────┼───────────┼──────────┼──────║
║  can_import    │   ?   │   ?    │       ?        │     ?     │    ?     │  ?   ║
║  can_transcribe│   ?   │   ?    │       ?        │     ?     │    ?     │  ?   ║
║  can_review    │   ?   │   ?    │       ?        │     ?     │    ?     │  ?   ║
║  can_edit      │   ?   │   ?    │       ?        │     ?     │    ?     │  ?   ║
║  can_delete    │   ?   │   ?    │       ?        │     ?     │    ?     │  ?   ║
║  can_manage_   │   ?   │   ?    │       ?        │     ?     │    ?     │  ?   ║
║  users         │       │        │                │           │          │      ║
║                                                                                ║
║  ? = Valeur définie manuellement par l'admin (case à cocher dans l'UI)         ║
║  Le rôle technique n'a AUCUN impact sur ces permissions !                      ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  B. CORRECTEUR COLLABORATIF (permissions dérivées du rôle - FIXES)            ║
║  ─────────────────────────────────────────────────────────────────────────     ║
║                                                                                ║
║  Action / Rôle        │ admin │ editor │ redacteur_chef │ corrector │ reviewer ║
║  ─────────────────────┼───────┼────────┼────────────────┼───────────┼──────────║
║  merge_blocks         │   ✅  │   ✅   │       ✅       │     ❌    │    ❌    ║
║  propose_modification │   ✅  │   ✅   │       ✅       │     ✅    │    ❌    ║
║  comment              │   ✅  │   ✅   │       ✅       │     ✅    │    ✅    ║
║  close_session        │   ✅  │   ✅   │       ❌       │     ❌    │    ❌    ║
║  edit_directly        │   ✅  │   ✅   │       ✅       │     ❌    │    ❌    ║
║  view_only            │   ✅  │   ✅   │       ✅       │     ✅    │    ✅    ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
*/


-- =====================================================
-- 9. CONFIRMATION DE LA MIGRATION
-- =====================================================

-- Affiche un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 011 appliquée avec succès !';
  RAISE NOTICE '   - Nouvelles colonnes ajoutées : timezone, preferred_lang';
  RAISE NOTICE '   - Nouveaux rôles disponibles : redacteur_chef, corrector, reviewer';
  RAISE NOTICE '   - Fonction user_has_permission() créée';
  RAISE NOTICE '   - Vue active_users mise à jour';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier les rôles actuels :';
  RAISE NOTICE '   SELECT email, role, timezone, preferred_lang FROM users;';
END $$;

