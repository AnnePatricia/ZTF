import React from "react";
import { DocumentStatus } from "../document";
import { STATUS_LABELS } from "../document";

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: string[];
  selectedStatus: DocumentStatus | null;
  setSelectedStatus: (status: DocumentStatus | null) => void;
  onValidate: (status: DocumentStatus) => void;
  documentStatuses: DocumentStatus[];
  statusClass: (status: string) => string;
}

const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  selectedDocuments,
  selectedStatus,
  setSelectedStatus,
  onValidate,
  documentStatuses,
  statusClass,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
        onClick={onClose}
      ></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              <i className="fas fa-exchange-alt mr-2 text-green-500"></i>
              Changer le statut
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''} sélectionné{selectedDocuments.length > 1 ? 's' : ''}
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {documentStatuses.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                  selectedStatus === status ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''
                }`}
              >
                <span className={`inline-block w-3 h-3 rounded-full ${statusClass(status).split(' ')[0].replace('text', 'bg')}`}></span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{STATUS_LABELS[status]}</span>
              </button>
            ))}
          </div>

          {/* BOUTONS DE VALIDATION */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-all duration-200"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (selectedStatus) {
                  onValidate(selectedStatus);
                } else {
                  alert('⚠️ Veuillez sélectionner un statut');
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-all duration-200 hover:shadow-lg"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusModal;