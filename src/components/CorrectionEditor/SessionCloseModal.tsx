// =====================================================
// COMPOSANT: SessionCloseModal
// Description: Modal de clôture de session de correction
// =====================================================

import React from 'react';

interface SessionCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stats: {
    totalBlocks: number;
    mergedBlocks: number;
    pendingProposals: number;
    openComments: number;
    duration: string;
    collaborators: string[];
    totalOperations: number;
  };
}

const SessionCloseModal: React.FC<SessionCloseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  stats,
}) => {
  if (!isOpen) return null;

  const progressPercent =
    stats.totalBlocks > 0
      ? Math.round((stats.mergedBlocks / stats.totalBlocks) * 100)
      : 0;

  const isReadyToClose =
    stats.pendingProposals === 0 && stats.openComments === 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fas fa-check text-2xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Session prête à clore</h3>
                <p className="text-green-100">Relecture 2 terminée</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Progression globale */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progression globale
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {stats.mergedBlocks} / {stats.totalBlocks} blocs validés
              </p>
            </div>

            {/* Statut */}
            {isReadyToClose ? (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-2xl"></i>
                  <div>
                    <p className="font-bold text-green-900 dark:text-green-200">
                      ✅ Session prête à être clôturée
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Toutes les propositions ont été traitées
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
                  <div>
                    <p className="font-bold text-red-900 dark:text-red-200">
                      ⚠️ Session non terminée
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {stats.pendingProposals > 0 && (
                        <span>
                          {stats.pendingProposals} proposition{stats.pendingProposals > 1 ? 's' : ''} en attente
                          {stats.openComments > 0 ? ' et ' : ''}
                        </span>
                      )}
                      {stats.openComments > 0 && (
                        <span>
                          {stats.openComments} commentaire{stats.openComments > 1 ? 's' : ''} ouvert{stats.openComments > 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Résumé de la session */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Durée</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.duration}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Collaborateurs</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.collaborators.length}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Opérations</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.totalOperations}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Taux de validation</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {progressPercent}%
                </div>
              </div>
            </div>

            {/* Liste des collaborateurs */}
            {stats.collaborators.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  Collaborateurs de la session
                </h4>

                <div className="flex flex-wrap gap-2">
                  {stats.collaborators.map((name, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prochaine étape */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-3">
                <i className="fas fa-arrow-right text-blue-600 dark:text-blue-400 text-xl"></i>
                <div>
                  <p className="font-bold text-blue-900 dark:text-blue-200">
                    Prochaine étape : Correction finale
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Après clôture, le document passera en relecture finale
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Annuler
            </button>

            <div className="flex gap-3">
              <button className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">
                <i className="fas fa-file-export mr-2"></i>
                Exporter le rapport
              </button>

              <button
                onClick={onConfirm}
                disabled={!isReadyToClose}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <i className="fas fa-rocket"></i>
                {isReadyToClose ? 'Clôturer la session' : 'Session non terminée'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SessionCloseModal;
