// src/components/departments/D8/D8Workspace.tsx
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { usePublication } from '../../../hooks/usePublication';
import { useRoles } from '../../../hooks/useRoles';
import { PUBLICATION_STATUS_CONFIG } from '../../../types/publication';
import PublicationEditor from './PublicationEditor';
import RegistryViewer from './RegistryViewer';
import type { PublicationTask } from '../../../types/publication';

interface D8WorkspaceProps {
  department?: string;
  readOnly?: boolean;
}

export default function D8Workspace({ readOnly = false }: D8WorkspaceProps) {
  const { tasks, registries, loading, error, refresh, createTask, deleteTask } = usePublication();
  const { isChef, isAdmin } = useRoles();
  const [selectedTask, setSelectedTask] = useState<PublicationTask | null>(null);
  const [viewMode, setViewMode] = useState<'queue' | 'editor' | 'registry'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    metadataPending: tasks.filter(t => t.status === 'metadata_pending').length,
    coverPending: tasks.filter(t => t.status === 'cover_pending').length,
    formatsGenerating: tasks.filter(t => t.status === 'formats_generating').length,
    published: tasks.filter(t => t.status === 'published').length,
    registered: tasks.filter(t => t.status === 'registered').length,
    totalRegistries: registries.length,
  };

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  const handleCreateTask = async () => {
    const bookId = prompt('ID ZTF du livre (ex: TRANS-2026-00001) :');
    if (!bookId) return;

    const { data: book, error: fetchError } = await supabase
      .from('ztf_books')
      .select('id, status')
      .eq('ztf_id', bookId)
      .single();

    if (fetchError || !book) {
      alert(`❌ Livre "${bookId}" non trouvé`);
      return;
    }

    if (book.status !== 'ARCHIVED') {
      alert(`❌ Le livre "${bookId}" n'a pas encore été archivé (D7).\n\nStatut actuel : ${book.status}`);
      return;
    }

    const { data: existing } = await supabase
      .from('publication_tasks')
      .select('id')
      .eq('book_id', book.id)
      .single();

    if (existing) {
      alert(`⚠️ Une tâche de publication existe déjà pour "${bookId}"`);
      return;
    }

    const { data: v2Task } = await supabase
      .from('proofreading_v2_tasks')
      .select('id')
      .eq('book_id', book.id)
      .eq('status', 'archived')
      .single();

    const { data: archive } = await supabase
      .from('final_archives')
      .select('id')
      .eq('book_id', book.id)
      .single();

    const task = await createTask(book.id, v2Task?.id, archive?.id);
    if (task) {
      alert(`✅ Tâche de publication créée !\n\n📚 Titre : ${task.title}`);
    }
  };

  const handleDeleteTask = async (task: PublicationTask) => {
    if (!confirm(`️ Supprimer la tâche de publication pour "${task.book?.ztf_id}" ?`)) return;
    const success = await deleteTask(task.id);
    if (success) alert('✅ Tâche supprimée');
  };

  const handleOpenEditor = (task: PublicationTask) => {
    setSelectedTask(task);
    setViewMode('editor');
  };

  const handleBackToQueue = () => {
    setSelectedTask(null);
    setViewMode('queue');
    refresh();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du module D8...</p>
      </div>
    );
  }

  if (viewMode === 'editor' && selectedTask) {
    return <PublicationEditor task={selectedTask} onBack={handleBackToQueue} />;
  }

  if (viewMode === 'registry') {
    return <RegistryViewer registries={registries} onBack={() => setViewMode('queue')} />;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-rocket"></i>
              Module D8 — Pré-BAT & BAT
            </h1>
            <p className="text-emerald-100 mt-2">
              Finalisation, multi-formats et diffusion
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('registry')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg px-4 py-3 font-semibold flex items-center gap-2"
            >
              <i className="fas fa-registered"></i>
              Registre ({stats.totalRegistries})
            </button>
            {!readOnly && (isChef() || isAdmin()) && (
              <button onClick={handleCreateTask}>
                Nouvelle tâche
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-emerald-100">En attente</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-300">{stats.metadataPending}</p>
            <p className="text-xs text-emerald-100">Métadonnées</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-300">{stats.coverPending}</p>
            <p className="text-xs text-emerald-100">Couverture</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-300">{stats.formatsGenerating}</p>
            <p className="text-xs text-emerald-100">Formats</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{stats.published}</p>
            <p className="text-xs text-emerald-100">Publiés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-300">{stats.registered}</p>
            <p className="text-xs text-emerald-100">Enregistrés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.totalRegistries}</p>
            <p className="text-xs text-emerald-100">Registre</p>
          </div>
        </div>
      </div>

      {/* Règles métier */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h3 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-2">
          <i className="fas fa-exclamation-triangle"></i>
          Règles métier D8
        </h3>
        <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
          <li>• <strong>Génération multi-formats</strong> : PDF, EPUB, MOBI, HTML</li>
          <li>• <strong>Métadonnées complètes</strong> : titre, auteur, ISBN, date</li>
          <li>• <strong>Couverture obligatoire</strong> avant publication</li>
          <li>• <strong>Publication multi-plateformes</strong> : Amazon, Apple, Google, Kobo</li>
          <li>• <strong>Enregistrement final</strong> dans le registre ZTF</li>
        </ul>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
          >
            Tous ({stats.total})
          </button>
          {Object.entries(PUBLICATION_STATUS_CONFIG).map(([status, config]) => {
            const count = tasks.filter(t => t.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${statusFilter === status ? `${config.color} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
              >
                <i className={`fas ${config.icon}`}></i>
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID ZTF</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auteur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formats</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plateformes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <i className="fas fa-rocket text-5xl mb-4 block opacity-50"></i>
                    Aucune tâche de publication
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const statusConfig = PUBLICATION_STATUS_CONFIG[task.status];
                  const formatsCount = task.formats_list?.length || 0;
                  const platformsCount = task.platforms_list?.length || 0;

                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-mono bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded">
                          {task.book?.ztf_id || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                          {task.title || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {task.author || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${statusConfig.color}`}>
                          <i className={`fas ${statusConfig.icon} mr-1`}></i>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                          <i className="fas fa-file mr-1"></i>
                          {formatsCount} format{formatsCount > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                          <i className="fas fa-globe mr-1"></i>
                          {platformsCount} plateforme{platformsCount > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenEditor(task)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-edit"></i>
                            {task.status === 'pending' ? 'Démarrer' : 'Continuer'}
                          </button>

                          {task.status === 'registered' && (
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded text-sm">
                              <i className="fas fa-check-circle mr-1"></i>
                              Terminé
                            </span>
                          )}

                          {(isChef() || isAdmin()) && task.status !== 'registered' && (
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-300 rounded text-sm flex items-center gap-1"
                              title="Supprimer"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}