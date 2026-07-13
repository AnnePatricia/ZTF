import React from 'react';
import { useDiff, DiffResult } from '../../hooks/useDiff';

// ✅ Interface clairement définie et exportée
export interface DiffViewerProps {
  oldVersion: any;
  newVersion: any;
  onClose?: () => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldVersion, newVersion, onClose }) => {
  // Validation des props
  if (!oldVersion || !newVersion) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 text-center max-w-md">
          <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Erreur de comparaison</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Versions invalides pour la comparaison
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const { computeDiff } = useDiff();
  const diff: DiffResult = computeDiff(oldVersion.content, newVersion.content);

  const timeDiff = new Date(newVersion.created_at).getTime() - new Date(oldVersion.created_at).getTime();
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            <i className="fas fa-code-compare mr-2 text-blue-500"></i>
            Comparaison : Version {oldVersion.version_number} ←→ Version {newVersion.version_number}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-colors"
              aria-label="Fermer"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex justify-between text-sm">
          <div className="flex gap-6">
            <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
              <i className="fas fa-plus-circle mr-1.5"></i>
              +{diff.stats.added} mots ajoutés
            </span>
            <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
              <i className="fas fa-minus-circle mr-1.5"></i>
              -{diff.stats.removed} mots supprimés
            </span>
            <span className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
              <i className="fas fa-clock mr-1.5"></i>
              {days}j {hours}h d'écart
            </span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">
            Modifié par : {newVersion.created_by_name || 'Éditeur'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700 flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-gray-700/30">
            <div className="flex items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <i className="fas fa-history text-gray-400 mr-2 text-lg"></i>
              <h4 className="font-bold text-gray-700 dark:text-gray-300">
                Version {oldVersion.version_number}
              </h4>
              <span className="ml-3 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                {new Date(oldVersion.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
              {diff.error ? (
                <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {diff.error}
                </div>
              ) : diff.wordDiff.length === 0 ? (
                <p className="text-gray-500 italic">Aucun contenu textuel disponible</p>
              ) : (
                diff.wordDiff.map((part, i) => 
                  part.removed ? (
                    <span 
                      key={i} 
                      className="bg-red-200 dark:bg-red-900/40 line-through px-1 py-0.5 rounded mx-0.5"
                      title="Supprimé dans la nouvelle version"
                    >
                      {part.value}
                    </span>
                  ) : part.added ? null : (
                    <span key={i}>{part.value}</span>
                  )
                )
              )}
            </div>
          </div>

          <div className="p-6 overflow-y-auto bg-white dark:bg-gray-800">
            <div className="flex items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <i className="fas fa-star text-yellow-500 mr-2 text-lg"></i>
              <h4 className="font-bold text-gray-700 dark:text-gray-300">
                Version {newVersion.version_number}
              </h4>
              <span className="ml-3 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                {new Date(newVersion.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
              {diff.error ? (
                <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {diff.error}
                </div>
              ) : diff.wordDiff.length === 0 ? (
                <p className="text-gray-500 italic">Aucun contenu textuel disponible</p>
              ) : (
                diff.wordDiff.map((part, i) => 
                  part.added ? (
                    <span 
                      key={i} 
                      className="bg-green-200 dark:bg-green-900/40 px-1 py-0.5 rounded font-medium mx-0.5"
                      title="Ajouté par rapport à l'ancienne version"
                    >
                      {part.value}
                    </span>
                  ) : part.removed ? null : (
                    <span key={i}>{part.value}</span>
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;