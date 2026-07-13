// =====================================================
// HOOK: useUserRoles
// Description: Gestion des utilisateurs et des rôles
//              Sépare clairement :
//              - Rôles techniques (correcteur collaboratif)
//              - Permissions fonctionnelles (workflow existant)
// =====================================================

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// =====================================================
// TYPES
// =====================================================

/**
 * Rôles techniques (pour le correcteur collaboratif)
 */
export type UserRole = 
  | 'admin'
  | 'editor'
  | 'redacteur_chef'
  | 'corrector'
  | 'reviewer'
  | 'user';

/**
 * Permissions du workflow existant
 */
export interface UserPermissions {
  can_import: boolean;
  can_transcribe: boolean;
  can_review: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage_users: boolean;
}

/**
 * Utilisateur complet
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  department?: string;
  team?: string;
  timezone: string;
  preferred_lang: string;
  created_at: string;
  updated_at: string;
}

/**
 * Utilisateur avec permissions
 */
export interface UserWithPermissions extends User, UserPermissions {}

/**
 * Permissions du correcteur collaboratif (dérivées du rôle)
 */
export interface CollaboratorPermissions {
  merge_blocks: boolean;
  propose_modification: boolean;
  comment: boolean;
  close_session: boolean;
  edit_directly: boolean;
  view_only: boolean;
}

/**
 * État du hook
 */
interface UseUserRolesState {
  users: UserWithPermissions[];
  loading: boolean;
  error: string | null;
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useUserRoles() {
  const [state, setState] = useState<UseUserRolesState>({
    users: [],
    loading: true,
    error: null,
  });

  // =====================================================
  // 1. CHARGER TOUS LES UTILISATEURS
  // =====================================================
  
  const fetchUsers = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      console.log('🔍 [useUserRoles] Fetching users...');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('❌ [useUserRoles] Error fetching users:', error);
        throw error;
      }

      console.log('✅ [useUserRoles] Users fetched:', data?.length);
      console.log('📄 [useUserRoles] Users data:', data);

      setState({
        users: data as UserWithPermissions[],
        loading: false,
        error: null,
      });

      return data;
    } catch (err: any) {
      console.error('❌ [useUserRoles] Error in fetchUsers:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
      return null;
    }
  };

  // =====================================================
  // 2. CHARGER UN UTILISATEUR SPÉCIFIQUE
  // =====================================================
  
  const getUserById = async (userId: string): Promise<UserWithPermissions | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return data as UserWithPermissions;
    } catch (err: any) {
      console.error('Erreur getUserById:', err);
      return null;
    }
  };

  // =====================================================
  // 3. METTRE À JOUR LE RÔLE TECHNIQUE
  // =====================================================
  
  /**
   * Change le rôle technique d'un utilisateur
   * N'affecte PAS les permissions du workflow existant
   */
  const updateUserRole = async (
    userId: string,
    newRole: UserRole
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Mettre à jour l'état local
      setState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ),
      }));

      return true;
    } catch (err: any) {
      console.error('Erreur updateUserRole:', err);
      return false;
    }
  };

  // =====================================================
  // 4. METTRE À JOUR LES PERMISSIONS (WORKFLOW)
  // =====================================================
  
  /**
   * Met à jour les permissions d'un utilisateur
   * N'affecte PAS le rôle technique
   */
  const updateUserPermissions = async (
    userId: string,
    permissions: Partial<UserPermissions>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Mettre à jour l'état local
      setState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId ? { ...user, ...permissions } : user
        ),
      }));

      return true;
    } catch (err: any) {
      console.error('Erreur updateUserPermissions:', err);
      return false;
    }
  };

  // =====================================================
  // 5. VÉRIFIER UNE PERMISSION (via fonction SQL)
  // =====================================================
  
  /**
   * Vérifie si un utilisateur a une permission spécifique
   * Utilise la fonction SQL user_has_permission()
   */
  const userHasPermission = async (
    userId: string,
    permission: string
  ): Promise<boolean | null> => {
    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        p_user_id: userId,
        p_permission: permission,
      });

      if (error) throw error;

      return data;
    } catch (err: any) {
      console.error('Erreur userHasPermission:', err);
      return null;
    }
  };

  // =====================================================
  // 6. OBTENIR LES PERMISSIONS DU CORRECTEUR
  // =====================================================
  
  /**
   * Obtient les permissions du correcteur collaboratif
   * basées sur le rôle technique de l'utilisateur
   */
  const getCollaboratorPermissions = (role: UserRole): CollaboratorPermissions => {
    // Matrice des permissions par rôle
    const permissions: Record<UserRole, CollaboratorPermissions> = {
      admin: {
        merge_blocks: true,
        propose_modification: true,
        comment: true,
        close_session: true,
        edit_directly: true,
        view_only: true,
      },
      editor: {
        merge_blocks: true,
        propose_modification: true,
        comment: true,
        close_session: true,
        edit_directly: true,
        view_only: true,
      },
      redacteur_chef: {
        merge_blocks: true,
        propose_modification: true,
        comment: true,
        close_session: false,
        edit_directly: true,
        view_only: true,
      },
      corrector: {
        merge_blocks: false,
        propose_modification: true,
        comment: true,
        close_session: false,
        edit_directly: false,
        view_only: true,
      },
      reviewer: {
        merge_blocks: false,
        propose_modification: false,
        comment: true,
        close_session: false,
        edit_directly: false,
        view_only: true,
      },
      user: {
        merge_blocks: false,
        propose_modification: false,
        comment: false,
        close_session: false,
        edit_directly: false,
        view_only: true,
      },
    };

    return permissions[role] || permissions.user;
  };

  // =====================================================
  // 7. SUPPRIMER UN UTILISATEUR
  // =====================================================
  
  /**
   * Supprime un utilisateur (soft delete via is_deleted)
   * ou hard delete si la colonne n'existe pas
   */
  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      // Vérifier si is_deleted existe
      const { data: userData } = await supabase
        .from('users')
        .select('is_deleted')
        .eq('id', userId)
        .single();

      if (userData && 'is_deleted' in userData) {
        // Soft delete
        const { error } = await supabase
          .from('users')
          .update({
            is_deleted: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) throw error;
      } else {
        // Hard delete
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) throw error;
      }

      // Mettre à jour l'état local
      setState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== userId),
      }));

      return true;
    } catch (err: any) {
      console.error('Erreur deleteUser:', err);
      return false;
    }
  };

  // =====================================================
  // 8. CRÉER UN UTILISATEUR (via invitation)
  // =====================================================
  
  /**
   * Invite un nouvel utilisateur
   * Crée le compte dans auth.users + users
   */
  const inviteUser = async (
    email: string,
    fullName: string,
    role: UserRole = 'user',
    permissions?: Partial<UserPermissions>
  ): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
      // 1. Créer l'utilisateur dans auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-8), // Mot de passe aléatoire
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // 2. Créer le profil dans public.users
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email,
          full_name: fullName,
          role,
          timezone: 'Africa/Douala',
          preferred_lang: 'fr',
          ...permissions,
        }]);

      if (profileError) throw profileError;

      // Mettre à jour l'état local
      await fetchUsers();

      return { success: true, userId };
    } catch (err: any) {
      console.error('Erreur inviteUser:', err);
      return { success: false, error: err.message };
    }
  };

  // =====================================================
  // 9. METTRE À JOUR LE PROFIL
  // =====================================================
  
  /**
   * Met à jour le profil d'un utilisateur
   */
  const updateUserProfile = async (
    userId: string,
    updates: {
      full_name?: string;
      avatar_url?: string;
      department?: string;
      team?: string;
      timezone?: string;
      preferred_lang?: string;
    }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Mettre à jour l'état local
      setState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId ? { ...user, ...updates } : user
        ),
      }));

      return true;
    } catch (err: any) {
      console.error('Erreur updateUserProfile:', err);
      return false;
    }
  };

  // =====================================================
  // 10. CHARGEMENT INITIAL
  // =====================================================
  
  useEffect(() => {
    fetchUsers();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =====================================================
  // RETOUR DU HOOK
  // =====================================================
  
  return {
    // État
    users: state.users,
    loading: state.loading,
    error: state.error,

    // Actions
    fetchUsers,
    getUserById,
    updateUserRole,
    updateUserPermissions,
    userHasPermission,
    getCollaboratorPermissions,
    deleteUser,
    inviteUser,
    updateUserProfile,
  };
}

// =====================================================
// UTILITAIRES
// =====================================================

/**
 * Badge coloré par rôle (à utiliser dans l'UI)
 */
export const getRoleBadgeConfig = (role: UserRole) => {
  const configs: Record<UserRole, { color: string; label: string; icon: string }> = {
    admin: {
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      label: 'Admin',
      icon: '👑',
    },
    editor: {
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      label: 'Éditeur',
      icon: '📝',
    },
    redacteur_chef: {
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
      label: 'Rédac. chef',
      icon: '✒️',
    },
    corrector: {
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      label: 'Correcteur',
      icon: '✅',
    },
    reviewer: {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      label: 'Relecteur',
      icon: '👁️',
    },
    user: {
      color: 'bg-white text-gray-700 dark:bg-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-500',
      label: 'Utilisateur',
      icon: '👤',
    },
  };

  return configs[role] || configs.user;
};

/**
 * Description d'un rôle (pour tooltips ou modales)
 */
export const getRoleDescription = (role: UserRole): string => {
  const descriptions: Record<UserRole, string> = {
    admin: 'Super-utilisateur. Tous les droits, peut gérer les utilisateurs et clore les sessions.',
    editor: 'Chef de projet. Peut tout faire sauf gérer les utilisateurs. Peut clore les sessions de correction.',
    redacteur_chef: 'Rédacteur en chef. Peut approuver/rejeter les propositions mais ne peut pas clore les sessions.',
    corrector: 'Correcteur. Peut proposer des modifications et commenter, mais ne peut pas merger.',
    reviewer: 'Relecteur. Lecture seule + commentaires uniquement. Ne peut pas proposer de modifications.',
    user: 'Utilisateur de base. Permissions limitées, configurables via can_import, can_transcribe, etc.',
  };

  return descriptions[role] || descriptions.user;
};

/**
 * Matrice des permissions du correcteur (pour affichage UI)
 */
export const COLLABORATOR_PERMISSIONS_MATRIX = {
  admin: { merge: true, propose: true, comment: true, close: true, edit: true },
  editor: { merge: true, propose: true, comment: true, close: true, edit: true },
  redacteur_chef: { merge: true, propose: true, comment: true, close: false, edit: true },
  corrector: { merge: false, propose: true, comment: true, close: false, edit: false },
  reviewer: { merge: false, propose: false, comment: true, close: false, edit: false },
  user: { merge: false, propose: false, comment: false, close: false, edit: false },
} as const;
