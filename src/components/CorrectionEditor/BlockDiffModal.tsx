// =====================================================
// COMPOSANT: BlockDiffModal
// Description: Modal de comparaison de deux versions d'un bloc
// =====================================================

import React, { useState } from 'react';

interface BlockDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionA: any;
  versionB: any;
  labelA?: string;
  labelB?: string;
}

const BlockDiffModal: React.FC<BlockDiffModalProps> = ({
  isOpen,
  onClose,
  versionA,
  versionB,
  labelA = 'Version A',
  labelB = 'Version B',
}) => {
  const [zoom, setZoom] = useState(100);

  if (!isOpen) return null;

  // Fonction simple pour comparer deux textes
  const compareTexts = (textA: string, textB: string) => {
    const wordsA = textA.split(/\s+/);
    const wordsB = textB.split(/\s+/);

    const removed: string[] = [];
    const added: string[] = [];

    wordsA.forEach((word) => {
      if (!wordsB.includes(word)) {
        removed.push(word);
      }
    });

    wordsB.forEach((word) => {
      if (!wordsA.includes(word)) {
        added.push(word);
      }
    });

    return { removed, added, hasChanges: removed.length > 0 || added.length > 0 };
  };

  const textA = typeof versionA?.content === 'string' ? versionA.content : '';
  const textB = typeof versionB?.content === 'string' ? versionB.content : '';
  const diff = compareTexts(textA, textB);

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
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-code-compare text-purple-600"></i>
              Comparaison de versions
            </h3>

            <div className="flex items-center gap-4">
              {/* Zoom */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Zoom :</span>
                <select
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700"
                >
                  <option value={75}>75%</option>
                  <option value={100}>100%</option>
                  <option value={125}>125%</option>
                  <option value={150}>150%</option>
                </select>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Résumé */}
            <div className={`mb-6 p-4 rounded-lg ${
              diff.hasChanges
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
            }`}>
              <div className="flex items-center gap-3">
                {diff.hasChanges ? (
                  <i className="fas fa-exclamation-triangle text-amber-600 text-xl"></i>
                ) : (
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                )}
                <div>
                  <p className={`font-bold ${
                    diff.hasChanges
                      ? 'text-amber-900 dark:text-amber-200'
                      : 'text-green-900 dark:text-green-200'
                  }`}>
                    {diff.hasChanges
                      ? `${diff.removed.length} suppression${diff.removed.length > 1 ? 's'} et ${diff.added.length} ajout${diff.added.length > 1 ? 's'}`
                      : 'Aucune modification détectée'}
                  </p>
                  <p className={`text-sm ${
                    diff.hasChanges
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    Les deux versions sont {diff.hasChanges ? 'différentes' : 'identiques'}
                  </p>
                </div>
              </div>
            </div>

            {/* Comparaison côte à côte */}
            <div className="grid grid-cols-2 gap-6" style={{ zoom: `${zoom}%` }}>
              {/* Version A */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{labelA}</h4>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {textA.split(/\s+/).map((word, index) => {
                      const isRemoved = diff.removed.includes(word);
                      return (
                        <span
                          key={index}
                          className={
                            isRemoved
                              ? 'bg-red-200 dark:bg-red-900/50 line-through text-red-900 dark:text-red-200'
                              : ''
                          }
                        >
                          {word}{' '}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>

              {/* Version B */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{labelB}</h4>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {textB.split(/\s+/).map((word, index) => {
                      const isAdded = diff.added.includes(word) && !textA.includes(word);
                      return (
                        <span
                          key={index}
                          className={
                            isAdded
                              ? 'bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-200 font-medium'
                              : ''
                          }
                        >
                          {word}{' '}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Légende */}
            <div className="mt-6 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-200 dark:bg-red-900/50 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">Supprimé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 dark:bg-green-900/50 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">Ajouté</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {diff.hasChanges ? (
                <span>
                  <strong className="text-red-600">{diff.removed.length}</strong> suppressions,{' '}
                  <strong className="text-green-600">{diff.added.length}</strong> ajouts
                </span>
              ) : (
                <span className="text-green-600">✓ Versions identiques</span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              {diff.hasChanges && (
                <>
                  <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <i className="fas fa-undo mr-2"></i>
                    Restaurer {labelA}
                  </button>
                  <button className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <i className="fas fa-check mr-2"></i>
                    Approuver {labelB}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlockDiffModal;
