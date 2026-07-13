// =====================================================
// COMPOSANT: UsersTable
// Description: Tableau des utilisateurs avec gestion des rôles et permissions
// =====================================================
import React, { useState } from "react";
import { UserWithPermissions, UserRole } from "../../hooks/useUserRoles";
import RoleEditModal from "./modals/RoleEditModal";
import UserEditModal from "./modals/UserEditModal";

interface UsersTableProps {
  users: UserWithPermissions[];
  loading: boolean;
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>;
  onPermissionsChange: (userId: string, permissions: Partial<UserWithPermissions>) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

// ✅ Fonction utilitaire pour déterminer le badge de département
const getDepartmentBadge = (role: string | undefined, fullName: string | undefined, email: string | undefined) => {
  const name = (fullName || '').toLowerCase();
  const roleStr = (role || '').toLowerCase();
  const emailStr = (email || '').toLowerCase();

  // ✅ 1. ADMINISTRATEUR - Vérification par email EN PREMIER (priorité absolue)
  if (
    emailStr === 'kamfotsobruno@gmail.com' ||
    roleStr === 'admin' || 
    name.includes('admin') ||
    emailStr.includes('admin')
  ) {
    return { 
      label: 'Administrateur', 
      color: 'bg-red-600 text-white', 
      icon: 'fa-shield-alt' 
    };
  }

  // ✅ 2. Chefs de département (CHEF D2, CHEF D3, etc.)
  const chefMatch = roleStr.match(/chef[_d]*(\d+)/);
  if (chefMatch) {
    const deptNum = chefMatch[1];
    return { 
      label: `Chef Module D${deptNum}`, 
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 
      icon: 'fa-crown' 
    };
  }

  // Détecte depuis le nom : "Chef Base de Données", "Chef Correction", etc.
  if (name.includes('chef')) {
    const chefMapping: Record<string, string> = {
      'base de données': '0',
      'basededonnees': '0',
      'transcription': '2',
      'nettoyage': '3',
      'éditorialisation': '4',
      'editorialisation': '4',
      'réécriture': '5',
      'reecriture': '5',
      'correction': '6',
      'traduction': '7',
      'bat': '8',
    };

    for (const [keyword, deptNum] of Object.entries(chefMapping)) {
      if (name.includes(keyword)) {
        return { 
          label: `Chef Module D${deptNum}`, 
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 
          icon: 'fa-crown' 
        };
      }
    }

    return { 
      label: 'Chef', 
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 
      icon: 'fa-crown' 
    };
  }

  // ✅ 3. Membres de département
  const membreMatch = roleStr.match(/membre[_d]*(\d+)/);
  if (membreMatch) {
    const deptNum = membreMatch[1];
    return { 
      label: `Membre Module D${deptNum}`, 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', 
      icon: 'fa-user' 
    };
  }

  // ✅ 4. Transcripteurs = D2
  if (name.includes('transcripteur') || roleStr.includes('transcripteur') || roleStr.includes('transcription')) {
    return { label: 'Module D2', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', icon: 'fa-keyboard' };
  }

  // ✅ 5. Nettoyeurs = D3
  if (name.includes('nettoyeur') || roleStr.includes('nettoyeur') || roleStr.includes('nettoyage')) {
    return { label: 'Module D3', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: 'fa-broom' };
  }

  // ✅ 6. Éditorialistes = D4
  if (name.includes('éditorialiste') || name.includes('editorialiste') || roleStr.includes('editorialiste') || roleStr.includes('éditorialisation')) {
    return { label: 'Module D4', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', icon: 'fa-sitemap' };
  }

  // ✅ 7. Correcteurs = D5
  if (name.includes('correcteur') || roleStr.includes('correcteur') || roleStr.includes('correction')) {
    return { label: 'Module D5', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300', icon: 'fa-pen-fancy' };
  }

  // ✅ 8. Relecteurs = D6
  if (name.includes('relecteur') || roleStr.includes('relecteur') || roleStr.includes('relecture')) {
    return { label: 'Module D6', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', icon: 'fa-spell-check' };
  }

  // ✅ 9. Traducteurs = D7
  if (name.includes('traducteur') || roleStr.includes('traducteur') || roleStr.includes('traduction')) {
    return { label: 'Module D7', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300', icon: 'fa-language' };
  }

  // Par défaut : Utilisateur
  return { label: 'Utilisateur', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: 'fa-user' };
};

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  onRoleChange,
  onPermissionsChange,
  onDelete,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenRoleModal = (user: UserWithPermissions) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditModal = (user: UserWithPermissions) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleRoleSave = async (newRole: UserRole) => {
    if (!selectedUser) return;
    await onRoleChange(selectedUser.id, newRole);
    setSelectedUser(null);
  };

  const handlePermissionsSave = async (updates: Partial<UserWithPermissions>) => {
    if (!selectedUser) return;
    await onPermissionsChange(selectedUser.id, updates);
    setSelectedUser(null);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      await onDelete(userId);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-spinner fa-spin text-4xl text-purple-600 mb-3"></i>
        <p className="text-gray-600 dark:text-gray-400">Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <>
      {/* Barre de recherche */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email, rôle ou UUID..."
            className="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                UUID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fonction / Département
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Dernière activité
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <i className="fas fa-inbox text-4xl mb-3"></i>
                  <p>Aucun utilisateur trouvé</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                // ✅ PASSER l'email à getDepartmentBadge
                const deptBadge = getDepartmentBadge(user.role, user.full_name, user.email);
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {/* Utilisateur */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-medium">
                          {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* UUID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {user.id.substring(0, 8)}...
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user.id);
                            alert('✅ UUID copié dans le presse-papiers');
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Copier l'UUID complet"
                        >
                          <i className="fas fa-copy text-xs"></i>
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]" title={user.id}>
                        {user.id}
                      </div>
                    </td>

                    {/* Fonction/Département */}
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 ${deptBadge.color}`}>
                        <i className={`fas ${deptBadge.icon}`}></i>
                        {deptBadge.label}
                      </span>
                    </td>

                    {/* Dernière activité */}
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenRoleModal(user)}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Modifier le rôle"
                        >
                          <i className="fas fa-user-tag"></i>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Modifier permissions"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {selectedUser && (
        <>
          <RoleEditModal
            isOpen={isRoleModalOpen}
            onClose={() => {
              setIsRoleModalOpen(false);
              setSelectedUser(null);
            }}
            userEmail={selectedUser.email}
            currentRole={selectedUser.role}
            onSave={handleRoleSave}
          />
          <UserEditModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSave={handlePermissionsSave}
          />
        </>
      )}
    </>
  );
};

export default UsersTable;