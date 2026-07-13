// =====================================================
// COMPOSANT: Users (Module de gestion des utilisateurs)
// Description: Interface complète de gestion des utilisateurs
//              avec séparation des deux systèmes de rôles :
//              - Rôles techniques (correcteur collaboratif)
//              - Permissions fonctionnelles (workflow existant)
// =====================================================
import React, { useState } from "react";
import { useUserRoles, UserRole } from "../../hooks/useUserRoles";
import UsersTable from "./UsersTable";
import RoleBadge from "./RoleBadge";

const Users: React.FC = () => {
  const {
    users,
    loading,
    error,
    updateUserRole,
    updateUserPermissions,
    deleteUser,
    inviteUser,
  } = useUserRoles();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [isInviting, setIsInviting] = useState(false);

  // ✅ GESTION DE L'ERREUR : Afficher un message d'erreur si le chargement échoue
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
          <i className="fas fa-exclamation-circle text-red-600 text-5xl mb-4"></i>
          <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
            Erreur de chargement des utilisateurs
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <i className="fas fa-redo"></i>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Gestion de l'invitation d'un nouvel utilisateur
  const handleInvite = async () => {
    if (!newUserEmail || !newUserName) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }
    setIsInviting(true);
    try {
      const result = await inviteUser(newUserEmail, newUserName, newUserRole);
      if (result.success) {
        alert('✅ Utilisateur invité avec succès !');
        setNewUserEmail('');
        setNewUserName('');
        setNewUserRole('user');
        setIsInviteModalOpen(false);
      } else {
        alert(`❌ Erreur: ${result.error}`);
      }
    } catch (err: any) {
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  // Gestion du changement de rôle
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const success = await updateUserRole(userId, newRole);
    if (success) {
      alert('✅ Rôle mis à jour !');
    } else {
      alert('❌ Erreur lors de la mise à jour du rôle');
    }
  };

  // Gestion du changement de permissions
  const handlePermissionsChange = async (
    userId: string,
    permissions: Partial<any>
  ) => {
    const success = await updateUserPermissions(userId, permissions);
    if (success) {
      alert('✅ Permissions mises à jour !');
    } else {
      alert(' Erreur lors de la mise à jour des permissions');
    }
  };

  // Gestion de la suppression
  const handleDelete = async (userId: string) => {
    const success = await deleteUser(userId);
    if (success) {
      alert('✅ Utilisateur supprimé !');
    } else {
      alert('❌ Erreur lors de la suppression');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <i className="fas fa-users text-purple-600"></i>
              Gestion des utilisateurs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez les rôles techniques et les permissions fonctionnelles
            </p>
          </div>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
          >
            <i className="fas fa-user-plus"></i>
            Nouvel utilisateur
          </button>
        </div>

        {/* Encart explicatif */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <i className="fas fa-info-circle text-purple-600"></i>
            Deux systèmes de rôles coexistent
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="space-y-2">
              <p className="font-semibold text-purple-700 dark:text-purple-300">
                1. Rôles techniques (correcteur collaboratif)
              </p>
              <p>
                Définis dans <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded">users.role</code>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <RoleBadge role="admin" size="sm" />
                <RoleBadge role="editor" size="sm" />
                <RoleBadge role="redacteur_chef" size="sm" />
                <RoleBadge role="corrector" size="sm" />
                <RoleBadge role="reviewer" size="sm" />
                <RoleBadge role="user" size="sm" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Contrôlent les boutons dans le correcteur collaboratif (Merger, Proposer, Commenter)
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                2. Permissions fonctionnelles (workflow)
              </p>
              <p>Booléens indépendants du rôle technique</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
                  can_import
                </span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                  can_transcribe
                </span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs rounded">
                  can_review
                </span>
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs rounded">
                  can_edit
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Contrôlent les actions dans le workflow existant (import, transcription, relecture)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <UsersTable
          users={users}
          loading={loading}
          onRoleChange={handleRoleChange}
          onPermissionsChange={handlePermissionsChange}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal d'invitation */}
      {isInviteModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
            onClick={() => setIsInviteModalOpen(false)}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fas fa-user-plus text-purple-600"></i>
                  Inviter un nouvel utilisateur
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                    placeholder="exemple@domaine.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rôle technique
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="user">Utilisateur (par défaut)</option>
                    <option value="admin">Administrateur</option>
                    <option value="editor">Éditeur / Chef de projet</option>
                    <option value="redacteur_chef">Rédacteur en chef</option>
                    <option value="corrector">Correcteur</option>
                    <option value="reviewer">Relecteur</option>
                  </select>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <i className="fas fa-info-circle mr-2"></i>
                    Un mot de passe aléatoire sera généré et envoyé par email.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                  disabled={isInviting}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={isInviting || !newUserEmail || !newUserName}
                  className="px-6 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Invitation...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Inviter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Users;