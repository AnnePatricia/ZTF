import React from "react";
import { DocumentFormData, DocumentStatus, STATUS_LABELS } from "../document";
import FileUpload from "../FileUpload";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDocument: any | null;
  newDocument: DocumentFormData;
  setNewDocument: (doc: DocumentFormData) => void;
  formErrors: { title: boolean; source: boolean; assigned_to: boolean };
  setFormErrors: (errors: any) => void;
  tagsInput: string;
  setTagsInput: (input: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  documentTypes: string[];
  documentStatuses: DocumentStatus[];
  assignees: string[];
  getWorkflowStep: (status: DocumentStatus) => 1 | 2 | 3 | 4 | 5;
  getWorkflowProgress: (status: DocumentStatus) => number;
  
  // ✅ PROPS POUR SYNCHRONISATION MEDIALIBRARY
  selectedMediaFile: any | null;
  showMediaLibrarySelector: boolean;
  setShowMediaLibrarySelector: (show: boolean) => void;
  handleMediaFileSelect: (file: any) => void;
  handleRemoveMediaSelection: () => void;
  rawFiles: any[];
  mediaLoading: boolean;
  isCheckingFile: boolean;
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  editingDocument,
  newDocument,
  setNewDocument,
  formErrors,
  setFormErrors,
  tagsInput,
  setTagsInput,
  onAddTag,
  onRemoveTag,
  onSubmit,
  documentTypes,
  documentStatuses,
  assignees,
  getWorkflowStep,
  getWorkflowProgress,
  
  // ✅ DÉSTRUCTURER LES PROPS MEDIALIBRARY
  selectedMediaFile,
  showMediaLibrarySelector,
  setShowMediaLibrarySelector,
  handleMediaFileSelect,
  handleRemoveMediaSelection,
  rawFiles,
  mediaLoading,
  isCheckingFile,
}) => {
  // ❌ PAS D'ÉTAT LOCAL ICI (tout vient des props)

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 animate-fade-in" onClick={onClose}></div>
      
      {/* Modale */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
          {/* En-tête */}
          <div className="px-6 py-4 border-b-2 border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              <i className={`fas ${editingDocument ? 'fa-edit' : 'fa-file-plus'} mr-2 text-purple-600`}></i>
              {editingDocument ? `Modifier : ${editingDocument.title}` : 'Nouveau document'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={onSubmit} className="p-6">
            {/* Titre */}
            <div className="mb-5">
              <label htmlFor="doc-title" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Titre du document <span className="text-red-500">*</span>
              </label>
              <input
                id="doc-title"
                type="text"
                value={newDocument.title}
                onChange={(e) => {
                  setNewDocument({ ...newDocument, title: e.target.value });
                  if (formErrors.title) setFormErrors({ ...formErrors, title: false });
                }}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-200 ${
                  formErrors.title ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                } dark:text-white font-medium`}
                required
                placeholder="Ex: Transcription - Interview 001"
              />
              {formErrors.title && <p className="mt-1 text-xs text-red-500 font-medium animate-fade-in">Le titre est requis</p>}
            </div>

            {/* Type et Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label htmlFor="doc-type" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Type de document</label>
                <select
                  id="doc-type"
                  value={newDocument.type}
                  onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white font-medium transition-all duration-200"
                >
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="doc-source" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Source <span className="text-red-500">*</span>
                </label>
                <input
                  id="doc-source"
                  type="text"
                  value={newDocument.source}
                  onChange={(e) => {
                    setNewDocument({ ...newDocument, source: e.target.value });
                    if (formErrors.source) setFormErrors({ ...formErrors, source: false });
                  }}
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-200 ${
                    formErrors.source ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } dark:text-white font-medium`}
                  required
                  placeholder="Ex: Audio, Interview, Archive..."
                />
                {formErrors.source && <p className="mt-1 text-xs text-red-500 font-medium animate-fade-in">La source est requise</p>}
              </div>
            </div>

            {/* Statut et Progression */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label htmlFor="doc-status" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Statut éditorial</label>
                <select
                  id="doc-status"
                  value={newDocument.status}
                  onChange={(e) => {
                    const value = e.target.value as DocumentStatus;
                    setNewDocument({
                      ...newDocument,
                      status: value,
                      workflow_step: getWorkflowStep(value),
                      progress: getWorkflowProgress(value),
                    });
                  }}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white font-medium transition-all duration-200"
                >
                  {documentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="doc-progress" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Progression (%)</label>
                <input
                  id="doc-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={newDocument.progress}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setNewDocument({ ...newDocument, progress: Math.min(100, Math.max(0, v)) });
                  }}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white font-medium transition-all duration-200"
                />
              </div>
            </div>

            {/* Assignation */}
            <div className="mb-5">
              <label htmlFor="doc-assigned" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Assigné à <span className="text-red-500">*</span>
              </label>
              <select
                id="doc-assigned"
                value={newDocument.assigned_to}
                onChange={(e) => {
                  setNewDocument({ ...newDocument, assigned_to: e.target.value });
                  if (formErrors.assigned_to) setFormErrors({ ...formErrors, assigned_to: false });
                }}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all duration-200 ${
                  formErrors.assigned_to ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                } dark:text-white font-medium`}
                required
              >
                <option value="">-- Sélectionner --</option>
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
              {formErrors.assigned_to && <p className="mt-1 text-xs text-red-500 font-medium animate-fade-in">Veuillez sélectionner</p>}
            </div>

            {/* Gestion des tags */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Tags <span className="text-xs text-gray-500 dark:text-gray-400">(Entrée ou +)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddTag())}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white font-medium transition-all duration-200"
                  placeholder="Ex: Volume 1, Yaoundé, Interview..."
                />
                <button type="button" onClick={onAddTag} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg font-semibold">
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(newDocument.tags || []).map((tag, index) => (
                  <span key={index} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100 rounded-full flex items-center gap-1 animate-scale-in font-medium">
                    #{tag}
                    <button type="button" onClick={() => onRemoveTag(tag)} className="hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* ✅ SECTION: Fichier MediaLibrary */}
            <div className="mb-6 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                <i className="fas fa-folder-open mr-2 text-purple-600"></i>
                Fichier MediaLibrary
              </h4>
              
              {/* ✅ AFFICHER LE FICHIER SÉLECTIONNÉ */}
              {selectedMediaFile ? (
                <div className="p-4 bg-green-100 dark:bg-green-900/40 border-2 border-green-300 dark:border-green-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <i className={`fas ${
                        selectedMediaFile.file_type === 'audio' ? 'fa-music text-blue-600' :
                        selectedMediaFile.file_type === 'pdf' ? 'fa-file-pdf text-red-600' :
                        'fa-file-image text-green-600'
                      } text-2xl`}></i>
                      <div>
                        <p className="text-sm font-bold text-green-900 dark:text-green-100">
                          {selectedMediaFile.file_name}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                          Statut: <span className="font-bold">{selectedMediaFile.status || 'libre'}</span> • {(selectedMediaFile.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveMediaSelection}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg"
                    >
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaLibrarySelector(!showMediaLibrarySelector)}
                  className="w-full px-4 py-4 border-2 border-dashed border-purple-400 dark:border-purple-500 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200 flex items-center justify-center gap-2 bg-white dark:bg-gray-700"
                >
                  <i className="fas fa-folder-open text-purple-600 text-lg"></i>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Choisir un fichier dans la Médiathèque</span>
                </button>
              )}

              {/* ✅ SÉLECTEUR DE FICHIERS MEDIALIBRARY */}
              {showMediaLibrarySelector && !selectedMediaFile && (
                <div className="mt-3 max-h-80 overflow-y-auto border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                  {mediaLoading ? (
                    <div className="p-6 text-center">
                      <i className="fas fa-spinner fa-spin text-purple-600 text-3xl mb-3"></i>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Chargement des fichiers...</p>
                    </div>
                  ) : rawFiles && rawFiles.length > 0 ? (
                    rawFiles
                      .filter((f: any) => f.status === 'libre' || !f.status)
                      .map((file: any) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => handleMediaFileSelect(file)}
                          disabled={isCheckingFile}
                          className="w-full p-4 text-left hover:bg-purple-100 dark:hover:bg-purple-900/50 border-b-2 border-gray-200 dark:border-gray-700 last:border-b-0 transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                        >
                          <i className={`fas ${
                            file.file_type === 'audio' ? 'fa-music text-blue-600' :
                            file.file_type === 'pdf' ? 'fa-file-pdf text-red-600' :
                            'fa-file-image text-green-600'
                          } text-xl`}></i>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                              {file.file_name}
                            </p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mt-1">
                              {(file.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(file.imported_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <span className="px-3 py-1.5 text-xs font-bold bg-green-100 dark:bg-green-900/60 text-green-900 dark:text-green-100 rounded-full whitespace-nowrap border border-green-300 dark:border-green-600">
                            ✓ Libre
                          </span>
                        </button>
                      ))
                  ) : (
                    <div className="p-6 text-center">
                      <i className="fas fa-inbox text-4xl mb-3 text-gray-400"></i>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Aucun fichier libre dans la Médiathèque</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">Importez d'abord des fichiers dans la Médiathèque</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✅ SECTION: Upload de fichier (si pas de sélection MediaLibrary) */}
            {!selectedMediaFile && (
              <div className="mb-6 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  <i className="fas fa-paperclip mr-2 text-gray-600 dark:text-gray-400"></i>
                  Ou uploader un nouveau fichier
                </h4>
                <FileUpload
                  documentId={editingDocument?.id || 'new'}
                  currentFileUrl={newDocument.file_url || null}
                  onFileUploaded={(url) => {
                    setNewDocument({ ...newDocument, file_url: url });
                  }}
                  onFileDeleted={() => {
                    setNewDocument({ ...newDocument, file_url: '' });
                  }}
                  maxFileSize={50 * 1024 * 1024}
                />
                {newDocument.file_url && !selectedMediaFile && (
                  <p className="mt-2 text-xs text-green-700 dark:text-green-300 flex items-center animate-fade-in font-medium">
                    <i className="fas fa-check-circle mr-1.5"></i>
                    Fichier attaché : {decodeURIComponent(newDocument.file_url.split('/').pop() || '')}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all duration-200">
                Annuler
              </button>
              <button type="submit" className="px-6 py-3 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-lg">
                <i className={`fas ${editingDocument ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                {editingDocument ? 'Mettre à jour' : 'Créer le document'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditModal;