import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { useMediaLibrary } from '../../hooks/MediaLibrary';
import { useDocumentMediaSync } from '../../hooks/useDocumentMediaSync';
import { useDocuments } from '../../hooks/useDocuments';
import type { DocumentFormData, DocumentStatus } from '../Documents/document';
import ImportD0Modal from '../departments/D0/ImportD0Modal';

const EditModal = lazy(() => import('../Documents/modals/EditModal'));

interface MediaLibraryProps {
  onBack?: () => void;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ onBack }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Tous");
  const [linkStatusFilter, setLinkStatusFilter] = useState<'all' | 'linked' | 'free'>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFileForDocument, setSelectedFileForDocument] = useState<any | null>(null);
  const [newDocument, setNewDocument] = useState<DocumentFormData>({
    title: "",
    type: "Transcription",
    source: "",
    status: "à_traiter",
    workflow_step: 1,
    progress: 0,
    assigned_to: "",
    tags: [],
    file_url: "",
    media_file_id: undefined,
  });
  const [formErrors, setFormErrors] = useState({ title: false, source: false, assigned_to: false });
  const [tagsInput, setTagsInput] = useState<string>("");
  const [showMediaLibrarySelector, setShowMediaLibrarySelector] = useState(false);
  const [isCheckingFile, setIsCheckingFile] = useState(false);

  const {
    rawFiles,
    loading,
    deleteRawFile,
    refreshAll,
  } = useMediaLibrary(linkStatusFilter);

  const { getLinkedDocuments, linkMediaToDocument, isMediaFileProcessed } = useDocumentMediaSync();
  const { createDocument } = useDocuments();

  const ModalLoader = () => (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 text-center">Chargement...</p>
      </div>
    </div>
  );

  const handleOpenEditModal = (file: any) => {
    setSelectedFileForDocument(file);
    setNewDocument({
      title: "",
      type: "Transcription",
      source: file.file_name,
      status: "à_traiter",
      workflow_step: 1,
      progress: 0,
      assigned_to: "",
      tags: [],
      file_url: "",
      media_file_id: file.id,
    });
    setFormErrors({ title: false, source: false, assigned_to: false });
    setTagsInput('');
    setShowMediaLibrarySelector(false);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedFileForDocument(null);
    setNewDocument({
      title: "",
      type: "Transcription",
      source: "",
      status: "à_traiter",
      workflow_step: 1,
      progress: 0,
      assigned_to: "",
      tags: [],
      file_url: "",
      media_file_id: undefined,
    });
    setFormErrors({ title: false, source: false, assigned_to: false });
    setTagsInput('');
    setShowMediaLibrarySelector(false);
  };

  const handleAddTag = () => {
    const tag = tagsInput.trim();
    if (tag && !newDocument.tags?.includes(tag)) {
      setNewDocument(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewDocument(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleMediaFileSelect = async (file: any) => {
    setIsCheckingFile(true);
    try {
      const isProcessed = await isMediaFileProcessed(file.id);
      if (isProcessed) {
        alert('⚠️ Ce fichier a déjà été traité.');
        return;
      }
      setSelectedFileForDocument(file);
      setNewDocument({
        ...newDocument,
        media_file_id: file.id,
        file_url: file.file_url,
        source: file.file_name
      });
      setShowMediaLibrarySelector(false);
    } catch (error) {
      console.error('Erreur sélection fichier:', error);
      alert('❌ Erreur lors de la sélection');
    } finally {
      setIsCheckingFile(false);
    }
  };

  const handleRemoveMediaSelection = () => {
    setSelectedFileForDocument(null);
    setNewDocument({
      ...newDocument,
      media_file_id: undefined,
      file_url: ''
    });
  };

  const getWorkflowStep = (status: DocumentStatus): 1 | 2 | 3 | 4 | 5 => {
    const steps: Record<DocumentStatus, 1 | 2 | 3 | 4 | 5> = {
      'à_traiter': 1,
      'transcription_en_cours': 2,
      'transcrit': 3,
      'projet_de_livre': 4,
      'relecture_1_en_cours': 4,
      'relecture_1_validé': 4,
      'relecture_2_en_cours': 5,
      'relecture_2_validé': 5
    };
    return steps[status] || 1;
  };

  const getWorkflowProgress = (status: DocumentStatus): number => {
    switch (status) {
      case 'à_traiter': return 0;
      case 'transcription_en_cours': return 15;
      case 'transcrit': return 30;
      case 'projet_de_livre': return 50;
      case 'relecture_1_en_cours': return 60;
      case 'relecture_1_validé': return 70;
      case 'relecture_2_en_cours': return 85;
      case 'relecture_2_validé': return 100;
      default: return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = {
      title: newDocument.title.trim() === "",
      source: newDocument.source.trim() === "",
      assigned_to: newDocument.assigned_to === "",
    };
    setFormErrors(newErrors);
    if (newErrors.title || newErrors.source || newErrors.assigned_to) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      const doc = await createDocument(newDocument);
      if (newDocument.media_file_id && doc?.id) {
        await linkMediaToDocument(
          doc.id,
          newDocument.media_file_id,
          'traité',
          newDocument.status
        );
        refreshAll();
      }
      alert("✅ Document créé avec succès !");
      handleCloseEditModal();
    } catch (err: any) {
      console.error('Erreur:', err);
      alert(`❌ Erreur: ${err.message}`);
    }
  };

  const documentStatuses: DocumentStatus[] = [
    'à_traiter',
    'transcription_en_cours',
    'transcrit',
    'projet_de_livre',
    'relecture_1_en_cours',
    'relecture_1_validé',
    'relecture_2_en_cours',
    'relecture_2_validé'
  ];

  const documentTypes = ["Transcription", "Audio", "Édition", "Vidéo", "Image"];
  const assignees = ["Non assigné", "Marie Dubois", "Thomas Martin", "Sophie Laurent", "Paul Morel", "Jean Dupont"];

  return (
    <div className="container mx-auto px-4 py-4 h-full flex flex-col">
      {/* ✅ Bouton retour (optionnel) */}
      {onBack && (
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2 mb-4"
        >
          <i className="fas fa-arrow-left"></i>
          Retour aux Documents
        </button>
      )}

      {/* ✅ Grille de la médiathèque uniquement */}
      <MediaLibraryGrid
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenEditModal={handleOpenEditModal}
        rawFiles={rawFiles}
        loading={loading}
        onDeleteFile={deleteRawFile}
        onRefresh={refreshAll}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        getLinkedDocuments={getLinkedDocuments}
        linkStatusFilter={linkStatusFilter}
        setLinkStatusFilter={setLinkStatusFilter}
      />

      {/* ✅ Modal d'import */}
      {isImportModalOpen && (
        <ImportD0Modal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
          }}
          onSuccess={() => {
            refreshAll();
          }}
        />
      )}

      {/* ✅ Modal d'édition */}
      {isEditModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <EditModal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            editingDocument={null}
            newDocument={newDocument}
            setNewDocument={setNewDocument}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            tagsInput={tagsInput}
            setTagsInput={setTagsInput}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onSubmit={handleSubmit}
            documentTypes={documentTypes}
            documentStatuses={documentStatuses}
            assignees={assignees}
            getWorkflowStep={getWorkflowStep}
            getWorkflowProgress={getWorkflowProgress}
            selectedMediaFile={selectedFileForDocument}
            showMediaLibrarySelector={showMediaLibrarySelector}
            setShowMediaLibrarySelector={setShowMediaLibrarySelector}
            handleMediaFileSelect={handleMediaFileSelect}
            handleRemoveMediaSelection={handleRemoveMediaSelection}
            rawFiles={rawFiles}
            mediaLoading={loading}
            isCheckingFile={isCheckingFile}
          />
        </Suspense>
      )}
    </div>
  );
};

// ✅ Export de MediaLibraryGrid pour utilisation dans Documents.tsx
export { MediaLibraryGrid };

// ✅ Composant MediaLibraryGrid
const MediaLibraryGrid: React.FC<{
  onOpenImport: () => void;
  onOpenEditModal?: (file: any) => void;
  rawFiles: any[];
  loading: boolean;
  onDeleteFile: (id: string) => Promise<boolean>;
  onRefresh: () => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  getLinkedDocuments: (mediaFileId: string) => Promise<any[]>;
  linkStatusFilter?: 'all' | 'linked' | 'free';
  setLinkStatusFilter?: (filter: 'all' | 'linked' | 'free') => void;
}> = ({ onOpenImport, onOpenEditModal, rawFiles, loading, onDeleteFile, onRefresh, statusFilter, setStatusFilter, getLinkedDocuments, linkStatusFilter, setLinkStatusFilter }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [dateFilter, setDateFilter] = useState("Tous");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const mediaStatuses = [
    { value: "Tous", label: "📊 Tous statuts" },
    { value: "libre", label: "🟢 Libre" },
    { value: "traité", label: " Traité" },
    { value: "transcrit", label: "🔵 Transcrit" },
    { value: "projet_de_livre", label: "🟣 Projet de Livre" },
    { value: "relecture_1_en_cours", label: "🟠 Relecture 1" },
    { value: "relecture_1_validé", label: "✅ Relecture 1 validée" },
    { value: "relecture_2_en_cours", label: "🟢 Relecture 2" },
    { value: "relecture_2_validé", label: "✅ Relecture 2 validée" },
  ];

  const filteredFiles = useMemo(() => {
    return rawFiles.filter((file) => {
      const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "Tous" || file.file_type === typeFilter;
      let matchesStatus = true;
      if (statusFilter === "Tous") {
        matchesStatus = true;
      } else {
        matchesStatus = file.status === statusFilter;
      }
      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = file.imported_at === new Date().toISOString().split('T')[0];
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = new Date(file.imported_at) >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = new Date(file.imported_at) >= monthAgo;
      }
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [rawFiles, searchTerm, typeFilter, statusFilter, dateFilter]);

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFiles, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, dateFilter]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio': return 'fas fa-music text-blue-500';
      case 'pdf': return 'fas fa-file-pdf text-red-500';
      case 'image': return 'fas fa-file-image text-green-500';
      default: return 'fas fa-file text-gray-500';
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
      const success = await onDeleteFile(id);
      if (success) {
        onRefresh();
        alert('✅ Fichier supprimé');
      } else {
        alert('❌ Erreur lors de la suppression');
      }
    }
  };

  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
              placeholder="🔍 Rechercher un fichier par nom..."
            />
            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={linkStatusFilter || 'all'}
              onChange={(e) => setLinkStatusFilter?.(e.target.value as 'all' | 'linked' | 'free')}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
            >
              <option value="all">📊 Tous les fichiers</option>
              <option value="free"> Fichiers libres</option>
              <option value="linked">🔗 Déjà liés</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
            >
              {mediaStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
            >
              <option value="Tous"> Tous types</option>
              <option value="audio">🎵 Audio</option>
              <option value="pdf">📄 PDF</option>
              <option value="image">🖼️ Image</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
            >
              <option value="Tous"> Toutes dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-3 transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-th"></i>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-3 transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
            <button
              onClick={onOpenImport}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <i className="fas fa-upload"></i>
              Importer
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong className="text-purple-600 dark:text-purple-400">{paginatedFiles.length}</strong> fichier{paginatedFiles.length > 1 ? 's' : ''} affiché{paginatedFiles.length > 1 ? 's' : ''} sur <strong>{filteredFiles.length}</strong> filtré{filteredFiles.length > 1 ? 's' : ''}
          </p>
          {(searchTerm || typeFilter !== "Tous" || statusFilter !== "Tous" || dateFilter !== "Tous") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("Tous");
                setStatusFilter("Tous");
                setDateFilter("Tous");
                setCurrentPage(1);
              }}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1"
            >
              <i className="fas fa-times-circle"></i>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>
      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
        {loading ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`}>
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : paginatedFiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <i className="fas fa-search text-5xl text-gray-400"></i>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium mb-2">
              Aucun fichier ne correspond aux filtres
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                getFileIcon={getFileIcon}
                onDelete={() => handleDelete(file.id)}
                getLinkedDocuments={getLinkedDocuments}
                onOpenEditModal={onOpenEditModal}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedFiles.map((file) => (
              <FileListItem
                key={file.id}
                file={file}
                getFileIcon={getFileIcon}
                onDelete={() => handleDelete(file.id)}
                getLinkedDocuments={getLinkedDocuments}
                onOpenEditModal={onOpenEditModal}
              />
            ))}
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page <strong className="text-purple-600 dark:text-purple-400">{currentPage}</strong> sur <strong>{totalPages}</strong> • {filteredFiles.length} résultat{filteredFiles.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
              >
                <i className="fas fa-chevron-left"></i>
                <span className="hidden sm:inline">Précédent</span>
              </button>
              <div className="flex gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="px-2 py-2 text-gray-500 dark:text-gray-400">...</span>
              )}
              {totalPages > 5 && currentPage < totalPages - 1 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-all duration-200"
                >
                  {totalPages}
                </button>
              )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
              >
                <span className="hidden sm:inline">Suivant</span>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FileCard: React.FC<{
  file: any;
  getFileIcon: any;
  onDelete: () => void;
  getLinkedDocuments: (mediaFileId: string) => Promise<any[]>;
  onOpenEditModal?: (file: any) => void;
}> = ({ file, getFileIcon, onDelete, getLinkedDocuments, onOpenEditModal }) => {
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLinkedDocs = async () => {
      const docs = await getLinkedDocuments(file.id);
      setLinkedDocs(docs);
    };
    fetchLinkedDocs();
  }, [file.id, getLinkedDocuments]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "libre": return "text-green-900 bg-green-100 dark:bg-green-900/60 dark:text-green-100 border-2 border-green-300 font-bold";
      case "traité": return "text-amber-900 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-100 border-2 border-amber-300 font-bold";
      case "transcrit": return "text-blue-900 bg-blue-100 dark:bg-blue-900/60 dark:text-blue-100 border-2 border-blue-300 font-bold";
      case "projet_livre": return "text-purple-900 bg-purple-100 dark:bg-purple-900/60 dark:text-purple-100 border-2 border-purple-300 font-bold";
      case "relecture_1": return "text-orange-900 bg-orange-100 dark:bg-orange-900/60 dark:text-orange-100 border-2 border-orange-300 font-bold";
      case "relecture_2": return "text-emerald-900 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-100 border-2 border-emerald-300 font-bold";
      default: return "text-gray-900 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 border-2 border-gray-300 font-bold";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "libre": return "🟢 Libre";
      case "traité": return "🟡 Traité";
      case "transcrit": return "🔵 Transcrit";
      case "projet_livre": return "🟣 Projet de Livre";
      case "relecture_1": return " Relecture 1";
      case "relecture_2": return "🟢 Relecture 2";
      default: return "⚪ Inconnu";
    }
  };

  return (
    <div className="group relative bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200 cursor-pointer">
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg z-10"
        title="Supprimer ce fichier"
      >
        <i className="fas fa-trash text-red-500"></i>
      </button>
      <div className="flex items-start gap-3 pr-10">
        <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <i className={`${getFileIcon(file.file_type)} text-2xl`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {file.file_name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date(file.imported_at).toLocaleDateString('fr-FR')} • {(file.file_size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mt-3">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getStatusClass(file.status || 'libre')}`}>
          {getStatusLabel(file.status || 'libre')}
        </span>
        {file.is_linked && (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-2 border-indigo-300 dark:border-indigo-600">
            <i className="fas fa-link mr-1"></i>
            {file.linked_documents_count || 1} document{(file.linked_documents_count || 1) > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {linkedDocs && linkedDocs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            <i className="fas fa-folder mr-1"></i>
            Lié à: {linkedDocs[0]?.documents?.title || 'Document'}
          </p>
        </div>
      )}
      {!file.is_linked ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenEditModal?.(file);
          }}
          className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg hover:shadow-xl opacity-0 group-hover:opacity-100 transform group-hover:-translate-y-0.5"
          title="Créer un document à partir de ce fichier"
        >
          <i className="fas fa-file-circle-plus"></i>
          Créer un document
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert(` Document lié : ${linkedDocs[0]?.documents?.title || 'Document'}\n\nStatut: ${getStatusLabel(file.status)}`);
          }}
          className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg hover:shadow-xl opacity-0 group-hover:opacity-100 transform group-hover:-translate-y-0.5"
          title="Voir le document lié"
        >
          <i className="fas fa-eye"></i>
          Voir le document
        </button>
      )}
    </div>
  );
};

const FileListItem: React.FC<{
  file: any;
  getFileIcon: any;
  onDelete: () => void;
  getLinkedDocuments: (mediaFileId: string) => Promise<any[]>;
  onOpenEditModal?: (file: any) => void;
}> = ({ file, getFileIcon, onDelete, getLinkedDocuments, onOpenEditModal }) => {
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLinkedDocs = async () => {
      const docs = await getLinkedDocuments(file.id);
      setLinkedDocs(docs);
    };
    fetchLinkedDocs();
  }, [file.id, getLinkedDocuments]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "libre": return "text-green-900 bg-green-100 dark:bg-green-900/60 dark:text-green-100 border-2 border-green-300 font-bold";
      case "traité": return "text-amber-900 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-100 border-2 border-amber-300 font-bold";
      case "transcrit": return "text-blue-900 bg-blue-100 dark:bg-blue-900/60 dark:text-blue-100 border-2 border-blue-300 font-bold";
      case "projet_livre": return "text-purple-900 bg-purple-100 dark:bg-purple-900/60 dark:text-purple-100 border-2 border-purple-300 font-bold";
      case "relecture_1": return "text-orange-900 bg-orange-100 dark:bg-orange-900/60 dark:text-orange-100 border-2 border-orange-300 font-bold";
      case "relecture_2": return "text-emerald-900 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-100 border-2 border-emerald-300 font-bold";
      default: return "text-gray-900 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 border-2 border-gray-300 font-bold";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "libre": return "🟢 Libre";
      case "traité": return "🟡 Traité";
      case "transcrit": return "🔵 Transcrit";
      case "projet_livre": return " Projet de Livre";
      case "relecture_1": return "🟠 Relecture 1";
      case "relecture_2": return "🟢 Relecture 2";
      default: return "⚪ Inconnu";
    }
  };

  return (
    <div className="group flex items-center justify-between bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200 cursor-pointer">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 rounded-xl flex items-center justify-center">
          <i className={`${getFileIcon(file.file_type)} text-xl`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {file.file_name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date(file.imported_at).toLocaleDateString('fr-FR')} • {(file.file_size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${getStatusClass(file.status || 'libre')}`}>
          {getStatusLabel(file.status || 'libre')}
        </span>
        {file.is_linked && (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-2 border-indigo-300 dark:border-indigo-600">
            <i className="fas fa-link mr-1"></i>
            {file.linked_documents_count || 1}
          </span>
        )}
        {!file.is_linked ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenEditModal?.(file);
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-semibold text-sm shadow-lg hover:shadow-xl opacity-0 group-hover:opacity-100"
            title="Créer un document à partir de ce fichier"
          >
            <i className="fas fa-file-circle-plus"></i>
            <span className="hidden lg:inline">Créer document</span>
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(`📄 Document lié : ${linkedDocs[0]?.documents?.title || 'Document'}\n\nStatut: ${getStatusLabel(file.status)}`);
            }}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-semibold text-sm shadow-lg hover:shadow-xl opacity-0 group-hover:opacity-100"
            title="Voir le document lié"
          >
            <i className="fas fa-eye"></i>
            <span className="hidden lg:inline">Voir document</span>
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
        >
          <i className="fas fa-trash text-red-500"></i>
        </button>
      </div>
    </div>
  );
};

export default MediaLibrary;