// =====================================================
// COMPOSANT: PermissionsPanel
// Description: Affiche et permet de modifier les permissions d'un utilisateur
// =====================================================

import React from "react";
import { UserWithPermissions } from "../../hooks/useUserRoles";

interface PermissionsPanelProps {
  user: UserWithPermissions;
  onChange?: (permissions: Partial<UserWithPermissions>) => void;
  readOnly?: boolean;
}

const PermissionsPanel: React.FC<PermissionsPanelProps> = ({
  user,
  onChange,
  readOnly = false,
}) => {
  const permissions = [
    {
      key: 'can_import' as const,
      label: 'Importer des fichiers',
      description: 'Peut importer des fichiers bruts dans la Médiathèque',
      icon: '📁',
    },
    {
      key: 'can_transcribe' as const,
      label: 'Transcrire',
      description: 'Peut créer et modifier des transcriptions',
      icon: '✏️',
    },
    {
      key: 'can_review' as const,
      label: 'Relire (Workflow)',
      description: 'Peut faire les relectures R1 et R2',
      icon: '👁️',
    },
    {
      key: 'can_edit' as const,
      label: 'Éditer / Créer projets',
      description: 'Peut créer des projets de livres',
      icon: '📚',
    },
    {
      key: 'can_delete' as const,
      label: 'Supprimer',
      description: 'Peut supprimer des documents',
      icon: '🗑️',
    },
    {
      key: 'can_manage_users' as const,
      label: 'Gérer les utilisateurs',
      description: 'Peut modifier les rôles et permissions',
      icon: '👥',
    },
  ];

  const handleChange = (key: keyof UserWithPermissions, checked: boolean) => {
    if (onChange) {
      onChange({ [key]: checked });
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
        <i className="fas fa-shield-alt text-purple-600"></i>
        Permissions du workflow existant
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {permissions.map((perm) => {
          const isChecked = user[perm.key] as boolean;

          return (
            <label
              key={perm.key}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                isChecked
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                  : 'border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600'
              } ${readOnly ? 'cursor-default' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
            >
              <div className="flex items-center gap-2 mt-0.5">
                {readOnly ? (
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      isChecked
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-500'
                    }`}
                  >
                    {isChecked && <i className="fas fa-check text-xs"></i>}
                  </div>
                ) : (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleChange(perm.key, e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{perm.icon}</span>
                  <span className="font-medium text-gray-800 dark:text-white text-sm">
                    {perm.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {perm.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {!readOnly && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-center gap-1.5">
          <i className="fas fa-info-circle"></i>
          Ces permissions sont indépendantes du rôle technique.
        </p>
      )}
    </div>
  );
};

export default PermissionsPanel;
