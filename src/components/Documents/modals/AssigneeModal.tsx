import React from "react";

interface AssigneeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: string[];
  selectedAssignee: string | null;
  setSelectedAssignee: (assignee: string | null) => void;
  onValidate: (assignee: string) => void;
  assignees: string[];
}

const AssigneeModal: React.FC<AssigneeModalProps> = ({
  isOpen,
  onClose,
  selectedDocuments,
  selectedAssignee,
  setSelectedAssignee,
  onValidate,
  assignees,
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
              <i className="fas fa-user-edit mr-2 text-purple-500"></i>
              Réassigner les documents
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
            {assignees.map((assignee) => (
              <button
                key={assignee}
                onClick={() => setSelectedAssignee(assignee)}
                className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                  selectedAssignee === assignee ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''
                }`}
              >
                <i className="fas fa-user text-purple-500 mr-2"></i>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{assignee}</span>
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
                if (selectedAssignee) {
                  onValidate(selectedAssignee);
                } else {
                  alert('⚠️ Veuillez sélectionner un assigné');
                }
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-all duration-200 hover:shadow-lg"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssigneeModal;