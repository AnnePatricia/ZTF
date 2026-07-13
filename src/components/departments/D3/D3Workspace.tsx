// src/components/departments/D3/D3Workspace.tsx
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useCleaning } from '../../../hooks/useCleaning';
import { useRoles } from '../../../hooks/useRoles';
import { CLEANING_STATUS_CONFIG } from '../../../types/cleaning';
import CleaningEditor from './CleaningEditor';
import CleaningVerifier from './CleaningVerifier';
import type { CleaningTask } from '../../../types/cleaning';

interface D3WorkspaceProps {
  department?: string;
  readOnly?: boolean;
}

export default function D3Workspace({ department, readOnly = false }: D3WorkspaceProps) {
  console.log('Department:', department);
  const { tasks, loading, error, refresh, deleteTask } = useCleaning();
  const { isChef, isAdmin } = useRoles();
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [viewMode, setViewMode] = useState<'queue' | 'editor' | 'verifier'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRules, setShowRules] = useState(false);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    verified: tasks.filter(t => t.status === 'verified').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  };

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  const handleCreateTask = async () => {
    const bookId = prompt('ID ZTF du livre (ex: TRANS-2026-00001) :');
    if (!bookId) return;

    const { data: book, error: fetchError } = await supabase
      .from('ztf_books')
      .select('id')
      .eq('ztf_id', bookId)
      .single();

    if (fetchError || !book) {
      alert(`❌ Livre "${bookId}" non trouvé`);
      return;
    }

    // ✅ Récupérer la tâche de transcription source ET son contenu
    const { data: sourceTask, error: sourceError } = await supabase
      .from('transcription_tasks')
      .select('id, transcription_content, word_count')
      .eq('book_id', book.id)
      .eq('status', 'verified')
      .single();

    if (sourceError || !sourceTask) {
      alert(`❌ Aucune transcription vérifiée trouvée pour "${bookId}"\n\nVeuillez d'abord créer et valider une transcription dans D2.`);
      return;
    }

    // ✅ Créer la tâche avec le contenu de la transcription (ou un contenu vide si null)
    const { error } = await supabase
      .from('cleaning_tasks')
      .insert({
        book_id: book.id,
        source_task_id: sourceTask.id,
        original_content: sourceTask.transcription_content || '<p>Contenu en attente de transcription</p>',  // ✅ Valeur par défaut
        word_count_original: sourceTask.word_count || 0,
        status: 'pending',
        checklist: [],
        created_at: new Date().toISOString()
      });

    if (error) {
      alert('❌ Erreur: ' + error.message);
      return;
    }

    alert(`✅ Tâche de nettoyage créée !\n\n📝 Contenu récupéré: ${sourceTask.word_count || 0} mots`);
    refresh();
  };

  const handleDeleteTask = async (task: CleaningTask) => {
    if (!confirm(`⚠️ Supprimer la tâche de nettoyage pour "${task.book?.ztf_id}" ?`)) return;
    const success = await deleteTask(task.id);
    if (success) alert('✅ Tâche supprimée');
  };

  // ✅ FONCTION handleOpenEditor
  const handleOpenEditor = (task: CleaningTask) => {
    console.log('Ouverture éditeur pour:', task);
    setSelectedTask(task);
    setViewMode('editor');
  };

  // ✅ FONCTION handleOpenVerifier
  const handleOpenVerifier = (task: CleaningTask) => {
    console.log('Ouverture vérificateur pour:', task);
    setSelectedTask(task);
    setViewMode('verifier');
  };

  // ✅ FONCTION handleBackToQueue
  const handleBackToQueue = () => {
    setSelectedTask(null);
    setViewMode('queue');
    refresh();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du module D3...</p>
      </div>
    );
  }

  // ✅ Mode éditeur
  if (viewMode === 'editor' && selectedTask) {
    return <CleaningEditor task={selectedTask} onBack={handleBackToQueue} />;
  }

  // ✅ Mode vérificateur
  if (viewMode === 'verifier' && selectedTask) {
    return <CleaningVerifier task={selectedTask} onBack={handleBackToQueue} />;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-broom"></i>
              Module D3 — Nettoyage Éditorial
            </h1>
            <p className="text-emerald-100 mt-2">
              Nettoyage systématique avec Track Changes
            </p>
          </div>
          {!readOnly && (isChef() || isAdmin()) && (
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Nouvelle tâche
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-emerald-100">En attente</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-emerald-100">En cours</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.submitted}</p>
            <p className="text-xs text-emerald-100">Soumis</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{stats.verified}</p>
            <p className="text-xs text-emerald-100">Validés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
            <p className="text-xs text-emerald-100">Rejetés</p>
          </div>
        </div>
      </div>

      {/* ✅ RÈGLES MÉTIER REPLIABLES */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            Règles métier D3
          </span>
          <i className={`fas fa-chevron-${showRules ? 'up' : 'down'} text-amber-600 dark:text-amber-400 transition-transform`}></i>
        </button>
        {showRules && (
          <div className="px-4 pb-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 pt-3">
              <li>• <strong>Travail sur copie uniquement</strong> — jamais sur l'original</li>
              <li>• Track Changes obligatoire : chaque modification doit être visible</li>
              <li>• Un nettoyeur ne peut pas valider son propre travail</li>
              <li>• Checklist complète obligatoire avant soumission</li>
            </ul>
          </div>
        )}
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
          {Object.entries(CLEANING_STATUS_CONFIG).map(([status, config]) => {
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nettoyeur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checklist</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Annotations</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <i className="fas fa-inbox text-5xl mb-4 block"></i>
                    Aucune tâche de nettoyage
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const statusConfig = CLEANING_STATUS_CONFIG[task.status];
                  const checklistDone = (task.checklist || []).filter((c: any) => c.checked).length;
                  const checklistTotal = (task.checklist || []).length;

                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-mono bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded">
                          {task.book?.ztf_id || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                          {task.book?.title || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {task.assigned_user?.full_name || 'Non assigné'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${statusConfig.color}`}>
                          <i className={`fas ${statusConfig.icon} mr-1`}></i>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-emerald-600"
                              style={{ width: `${checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {checklistDone}/{checklistTotal}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {task.annotations_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {(task.status === 'pending' || task.status === 'in_progress') && !readOnly && (
                            <button onClick={() => handleOpenEditor(task)}>
                              {task.status === 'pending' ? 'Démarrer' : 'Continuer'}
                            </button>
                          )}

                          {readOnly && <span className="text-xs text-gray-500">Lecture seule</span>}


                          {task.status === 'submitted' && (isChef() || isAdmin()) && (
                            <button
                              onClick={() => handleOpenVerifier(task)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                            >
                              <i className="fas fa-check"></i>
                              Vérifier
                            </button>
                          )}

                          {task.status === 'verified' && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-sm">
                              ✓ Livré à D4
                            </span>
                          )}

                          {(isChef() || isAdmin()) && (
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-sm flex items-center gap-1"
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