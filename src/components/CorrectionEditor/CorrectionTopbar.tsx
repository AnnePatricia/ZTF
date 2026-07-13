// =====================================================
// COMPOSANT: CorrectionTopbar
// Description: Barre de navigation supérieure
// =====================================================

import React from 'react';
import { Collaborator } from '../../hooks/useCollabSession';

interface CorrectionTopbarProps {
  documentTitle: string;
  collaborators: Collaborator[];
  onlineCount: number;
  myColor: string;
  progressPercent: number;
  onClose: () => void;
}

const CorrectionTopbar: React.FC<CorrectionTopbarProps> = ({
  documentTitle,
  collaborators,
  onlineCount,
  myColor,
  progressPercent,
  onClose,
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
      <div className="px-4 py-3">
        {/* Ligne 1 : Fil d'ariane et actions */}
        <div className="flex items-center justify-between">
          {/* Fil d'ariane */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Retour"
            >
              <i className="fas fa-arrow-left"></i>
            </button>

            <nav className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">bcm-gest</span>
              <i className="fas fa-chevron-right text-xs"></i>
              <span>Livres</span>
              <i className="fas fa-chevron-right text-xs"></i>
              <span className="text-gray-900 dark:text-white font-medium">{documentTitle}</span>
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                Relecture 2
              </span>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Progression */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                {progressPercent}%
              </span>
            </div>

            {/* Export */}
            <button
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Exporter"
            >
              <i className="fas fa-download"></i>
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>

        {/* Ligne 2 : Collaborateurs et statut */}
        <div className="flex items-center justify-between mt-3">
          {/* Collaborateurs */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              En ligne :
            </span>

            <div className="flex -space-x-2">
              {collaborators.slice(0, 5).map((collab) => (
                <div
                  key={collab.user_id}
                  className="relative group"
                  title={`${collab.full_name} (${collab.role})`}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: collab.cursor_color }}
                  >
                    {collab.cursor_label}
                  </div>
                  {collab.is_typing && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                  )}
                </div>
              ))}

              {onlineCount > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                  +{onlineCount - 5}
                </div>
              )}
            </div>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              {onlineCount} collaborateur{onlineCount > 1 ? 's' : ''}
            </span>
          </div>

          {/* Statut sync */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Sync active</span>
            </div>

            <span className="text-gray-300 dark:text-gray-600">|</span>

            <span>Dernière sync : à l'instant</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CorrectionTopbar;
