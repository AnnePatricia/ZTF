// src/components/Workflow/ZtfPipeline.tsx
import { useState } from 'react';
import { useZtfPipeline, ZTF_STATUSES, ZtfBook } from '../../hooks/useZtfPipeline';
import { useRoles } from '../../hooks/useRoles';

interface ZtfPipelineProps {
  onBack?: () => void;
}

export default function ZtfPipeline({ onBack }: ZtfPipelineProps) {
  const { booksByStatus, stats, loading, error, updateBookStatus, refresh } = useZtfPipeline();
  const { isAdmin } = useRoles(); // ✅ Seulement isAdmin est utilisé
  const [draggedBook, setDraggedBook] = useState<ZtfBook | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<ZtfBook | null>(null);
  const [filterDept, setFilterDept] = useState<string>('all');

  const handleDragStart = (book: ZtfBook) => {
    setDraggedBook(book);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedBook) return;
    
    // Vérifier les règles de transition
    const currentStatusIndex = ZTF_STATUSES.findIndex(s => s.code === draggedBook.ztf_status);
    const newStatusIndex = ZTF_STATUSES.findIndex(s => s.code === newStatus);
    
    // Règle : on ne peut pas sauter d'étapes (sauf admin)
    if (!isAdmin() && newStatusIndex !== currentStatusIndex + 1) {
      alert('❌ Vous ne pouvez pas sauter d\'étapes. Seule la transition suivante est autorisée.');
      setDraggedBook(null);
      setDragOverStatus(null);
      return;
    }

    if (!confirm(`Déplacer "${draggedBook.title}" de ${draggedBook.ztf_status} vers ${newStatus} ?`)) {
      setDraggedBook(null);
      setDragOverStatus(null);
      return;
    }

    const result = await updateBookStatus(draggedBook.id, newStatus);
    if (result.success) {
      alert(`✅ Livre déplacé vers ${newStatus}`);
    } else {
      alert(` Erreur: ${result.error}`);
    }
    
    setDraggedBook(null);
    setDragOverStatus(null);
  };

  // Filtrer par département
  const filteredStatuses = filterDept === 'all' 
    ? ZTF_STATUSES 
    : ZTF_STATUSES.filter(s => s.dept === filterDept);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du pipeline ZTF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <p className="text-red-700 dark:text-red-300">❌ Erreur: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2">
          <i className="fas fa-arrow-left"></i> Retour
        </button>
      )}

      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-project-diagram"></i>
              Pipeline Éditorial ZTF
            </h1>
            <p className="text-purple-100 mt-2">
              Production des 2 000 titres du Professeur Z.T. Fomum
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center gap-2 text-white"
            >
              <i className="fas fa-sync-alt"></i>
              Actualiser
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-purple-100">Total livres</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-purple-100">En production</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{stats.published}</p>
            <p className="text-xs text-purple-100">Publiés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs text-purple-100">Progression</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">2000</p>
            <p className="text-xs text-purple-100">Objectif</p>
          </div>
        </div>
      </div>

      {/* Filtre par département */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterDept('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${filterDept === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Tous les départements
          </button>
          {['D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'].map(dept => (
            <button
              key={dept}
              onClick={() => setFilterDept(dept)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${filterDept === dept ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {dept} ({stats.byDept[dept] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <i className="fas fa-info-circle"></i>
          Comment utiliser le pipeline ZTF
        </h3>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-6 list-disc">
          <li>Glissez-déposez les livres entre les étapes pour changer leur statut</li>
          <li>Les transitions doivent suivre l'ordre du pipeline (sauf pour l'admin)</li>
          <li>Chaque transition met à jour automatiquement le département responsable</li>
          <li>Cliquez sur un livre pour voir ses détails</li>
        </ul>
      </div>

      {/* Pipeline Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {filteredStatuses.map(status => {
          const statusBooks = booksByStatus[status.code] || [];
          const isDragOver = dragOverStatus === status.code;
          
          return (
            <div
              key={status.code}
              className={`rounded-xl border-2 transition-all duration-200 ${
                isDragOver
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-105'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
              onDragOver={(e) => handleDragOver(e, status.code)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(status.code)}
            >
              {/* En-tête de colonne */}
              <div className={`${status.color} text-white p-4 rounded-t-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold flex items-center gap-2">
                    <i className={`fas ${status.icon}`}></i>
                    {status.label}
                  </h3>
                  <span className="bg-white/20 px-2 py-1 rounded text-xs font-semibold">
                    {statusBooks.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs opacity-90">
                  <span>{status.dept}</span>
                  <span>{status.percentage}%</span>
                </div>
              </div>

              {/* Liste des livres */}
              <div className="p-3 space-y-2 min-h-[200px]">
                {statusBooks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    <i className="fas fa-inbox text-2xl mb-2 block"></i>
                    Aucun livre
                  </div>
                ) : (
                  statusBooks.map(book => (
                    <div
                      key={book.id}
                      draggable
                      onDragStart={() => handleDragStart(book)}
                      onClick={() => setShowDetails(book)}
                      className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg cursor-move hover:shadow-md transition-all border-2 border-transparent hover:border-purple-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {book.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {book.ztf_id}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                              {book.language}
                            </span>
                            <span className="text-xs text-gray-500">
                              {book.word_count?.toLocaleString('fr-FR') || 0} mots
                            </span>
                          </div>
                        </div>
                        <i className="fas fa-grip-vertical text-gray-400"></i>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal détails du livre */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Détails du livre
              </h3>
              <button
                onClick={() => setShowDetails(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ID ZTF</label>
                <p className="text-lg font-mono text-gray-900 dark:text-white">{showDetails.ztf_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Titre</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{showDetails.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Thème</label>
                  <p className="text-gray-900 dark:text-white">{showDetails.theme || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Langue</label>
                  <p className="text-gray-900 dark:text-white">{showDetails.language}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Statut actuel</label>
                  <p className="text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${ZTF_STATUSES.find(s => s.code === showDetails.ztf_status)?.color}`}>
                      {showDetails.ztf_status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Département</label>
                  <p className="text-gray-900 dark:text-white">{showDetails.current_department}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nombre de mots</label>
                <p className="text-gray-900 dark:text-white">{showDetails.word_count?.toLocaleString('fr-FR') || 0}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Créé le</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(showDetails.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mis à jour le</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(showDetails.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowDetails(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}