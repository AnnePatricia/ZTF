// =====================================================
// COMPOSANT: UserEditModal
// Description: Modal pour modifier les permissions et le profil d'un utilisateur
// =====================================================

import React, { useState } from "react";
import { UserWithPermissions, UserRole } from "../../../hooks/useUserRoles";
import PermissionsPanel from "../PermissionsPanel";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithPermissions;
  onSave: (updates: Partial<UserWithPermissions>) => Promise<void>;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'profile'>('permissions');
  const [isSaving, setIsSaving] = useState(false);
  const [updates, setUpdates] = useState<Partial<UserWithPermissions>>({});

  const handlePermissionChange = (permissions: Partial<UserWithPermissions>) => {
    setUpdates(prev => ({ ...prev, ...permissions }));
  };

  const handleProfileChange = (field: string, value: string) => {
    setUpdates(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(updates);
      onClose();
      setUpdates({});
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('❌ Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Modifier l'utilisateur
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('permissions')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'permissions'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <i className="fas fa-shield-alt mr-2"></i>
                Permissions
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <i className="fas fa-user mr-2"></i>
                Profil
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'permissions' && (
              <PermissionsPanel
                user={{ ...user, ...updates }}
                onChange={handlePermissionChange}
              />
            )}

            {activeTab === 'profile' && (
              <div className="space-y-5">
                {/* Nom complet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={updates.full_name ?? user.full_name}
                    onChange={(e) => handleProfileChange('full_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Département */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Département
                  </label>
                  <input
                    type="text"
                    value={updates.department ?? user.department ?? ''}
                    onChange={(e) => handleProfileChange('department', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Ex: Édition, Production..."
                  />
                </div>

                {/* Équipe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Équipe
                  </label>
                  <input
                    type="text"
                    value={updates.team ?? user.team ?? ''}
                    onChange={(e) => handleProfileChange('team', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Ex: Équipe A..."
                  />
                </div>

                {/* Fuseau horaire */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fuseau horaire
                  </label>
                  <select
                    value={updates.timezone ?? user.timezone}
                    onChange={(e) => handleProfileChange('timezone', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="Africa/Douala">Africa/Douala</option>
                    <option value="Africa/Abidjan">Africa/Abidjan</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Montreal">America/Montreal</option>
                  </select>
                </div>

                {/* Langue préférée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Langue préférée
                  </label>
                  <select
                    value={updates.preferred_lang ?? user.preferred_lang}
                    onChange={(e) => handleProfileChange('preferred_lang', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || Object.keys(updates).length === 0}
              className="px-6 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Enregistrement...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserEditModal;
