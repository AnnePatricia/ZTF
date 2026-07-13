import React from "react";
import { DocumentStatus } from "../document";
import { STATUS_LABELS } from "../document";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentVersions: any[];
  onCompare: (version: any) => void;
  onRestore: (versionId: string) => void;
  formatDateTime: (date: string) => string;
  statusClass: (status: string) => string;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  documentVersions,
  onCompare,
  onRestore,
  formatDateTime,
  statusClass,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold">
              <i className="fas fa-history mr-2 text-amber-500"></i>
              Historique des versions
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="p-6">
            {documentVersions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-fade-in">
                <i className="fas fa-inbox text-4xl mb-3"></i>
                <p>Aucune version antérieure</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documentVersions.map((version: any, index: number) => (
                  <div
                    key={version.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 animate-slide-down"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Version {version.version_number}
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formatDateTime(version.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onCompare(version)}
                          className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-md flex items-center transition-all duration-200"
                          title="Comparer avec la version précédente"
                        >
                          <i className="fas fa-code-compare mr-1"></i> Comparer
                        </button>
                        <button
                          onClick={() => onRestore(version.id)}
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center transition-all duration-200"
                        >
                          <i className="fas fa-undo mr-1"></i> Restaurer
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Titre :</span> {version.title}
                      </div>
                      <div>
                        <span className="font-medium">Statut :</span>
                        <span className={`ml-1 px-2 py-0.5 rounded text-xs ${statusClass(version.status)}`}>
                          {STATUS_LABELS[version.status as DocumentStatus]}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Progression :</span> {version.progress}%
                      </div>
                      <div>
                        <span className="font-medium">Assigné à :</span> {version.assigned_to}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Tags :</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {version.tags.map((tag: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistoryModal;