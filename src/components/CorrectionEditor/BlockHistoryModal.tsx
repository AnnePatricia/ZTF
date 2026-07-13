// =====================================================
// COMPOSANT: BlockHistoryModal
// Description: Modal d'historique des opérations d'un bloc
// =====================================================

import React from 'react';
import { useDocumentBlocks } from '../../hooks/useDocumentBlocks';

interface BlockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockId: string;
}

interface Operation {
  operation_id: string;
  op_type: string;
  op_data: any;
  user_id: string;
  user_name: string;
  applied_at: string;
  vector_clock: Record<string, number>;
}

const BlockHistoryModal: React.FC<BlockHistoryModalProps> = ({
  isOpen,
  onClose,
  blockId,
}) => {
  const { getBlockHistory } = useDocumentBlocks();
  const [history, setHistory] = React.useState<Operation[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && blockId) {
      setLoading(true);
      getBlockHistory(blockId).then((data) => {
        setHistory(data);
        setLoading(false);
      });
    }
  }, [isOpen, blockId, getBlockHistory]);

  if (!isOpen) return null;

  // Icône par type d'opération
  const getOpIcon = (type: string) => {
    switch (type) {
      case 'insert':
        return { icon: 'fa-plus', color: 'text-green-600' };
      case 'delete':
        return { icon: 'fa-minus', color: 'text-red-600' };
      case 'style':
        return { icon: 'fa-paint-brush', color: 'text-purple-600' };
      case 'move':
        return { icon: 'fa-arrows-alt', color: 'text-blue-600' };
      default:
        return { icon: 'fa-circle', color: 'text-gray-400' };
    }
  };

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
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-history text-amber-600"></i>
              Historique du bloc
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-4xl text-purple-600 mb-3"></i>
                <p className="text-gray-600 dark:text-gray-400">Chargement de l'historique...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-inbox text-3xl text-gray-400"></i>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Aucune opération enregistrée</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {history.length} opération{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
                </p>

                {history.map((op, index) => {
                  const opConfig = getOpIcon(op.op_type);

                  return (
                    <div
                      key={op.operation_id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0`}>
                        <i className={`fas ${opConfig.icon} ${opConfig.color}`}></i>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {op.user_name || 'Utilisateur'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(op.applied_at).toLocaleString('fr-FR')}
                          </span>
                        </div>

                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="capitalize font-medium">{op.op_type}</span>
                          {op.op_data?.text && (
                            <span className="ml-2 text-gray-500 dark:text-gray-400">
                              "{op.op_data.text}"
                            </span>
                          )}
                        </div>

                        {op.vector_clock && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                            Clock: {JSON.stringify(op.vector_clock)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlockHistoryModal;
