// =====================================================
// COMPOSANT: RoleEditModal
// Description: Modal pour changer le rôle technique d'un utilisateur
// =====================================================

import React, { useState } from "react";
import { UserRole, getRoleDescription, getRoleBadgeConfig } from "../../../hooks/useUserRoles";

interface RoleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  currentRole: UserRole;
  onSave: (newRole: UserRole) => Promise<void>;
}

const RoleEditModal: React.FC<RoleEditModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  currentRole,
  onSave,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [isSaving, setIsSaving] = useState(false);

  const roles: UserRole[] = [
    'admin',
    'editor',
    'redacteur_chef',
    'corrector',
    'reviewer',
    'user',
  ];

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedRole);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('❌ Erreur lors de la mise à jour du rôle');
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
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-user-tag text-purple-600"></i>
              Modifier le rôle technique
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Email de l'utilisateur */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Utilisateur</p>
              <p className="font-medium text-gray-900 dark:text-white">{userEmail}</p>
            </div>

            {/* Liste des rôles */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                Sélectionnez un rôle :
              </h4>

              {roles.map((role) => {
                const config = getRoleBadgeConfig(role);
                const description = getRoleDescription(role);
                const isSelected = selectedRole === role;

                return (
                  <label
                    key={role}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={isSelected}
                      onChange={() => setSelectedRole(role)}
                      className="w-5 h-5 mt-0.5 text-purple-600 focus:ring-purple-500"
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{config.icon}</span>
                        <span className={`font-semibold ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Avertissement */}
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <i className="fas fa-exclamation-triangle mt-0.5"></i>
                <span>
                  <strong>Important :</strong> Le rôle technique contrôle les permissions dans le
                  correcteur collaboratif. Les permissions du workflow existant (can_import, can_transcribe, etc.)
                  sont indépendantes et se gèrent dans l'onglet "Permissions".
                </span>
              </p>
            </div>
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
              disabled={isSaving || selectedRole === currentRole}
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

export default RoleEditModal;
