// src/components/departments/D7/D7Workspace.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useRoles } from '../../../hooks/useRoles';
import { TRANSLATION_STATUS_CONFIG, type TranslationTask } from '../../../types/translation';
import TranslationEditor from './TranslationEditor';
import StyleGuide from './StyleGuide';

interface D7WorkspaceProps {
  readOnly?: boolean;
}

export default function D7Workspace({ readOnly = false }: D7WorkspaceProps) {
  const { currentUser, isAdmin, isChefD7 } = useRoles();
  const [tasks, setTasks] = useState<TranslationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<TranslationTask | null>(null);
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('translation_tasks')
        .select(`
          *,
          book:ztf_books(id, ztf_id, title, theme, language),
          assigned_user:ztf_users!assigned_to(full_name, email),
          validator_1_user:ztf_users!validator_1(full_name, email),
          validator_2_user:ztf_users!validator_2(full_name, email)
        `)
        .order('created_at', { ascending: false });

      // Filtrer selon le rôle
      if (currentUser && !isAdmin() && !isChefD7()) {
        query = query.eq('assigned_to', currentUser.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const canEdit = !readOnly && (isAdmin() || isChefD7());

  const handleAssignTask = async (taskId: string) => {
    if (!currentUser) return;
    const userId = prompt("ID de l'utilisateur à assigner (UUID) :");
    if (!userId || userId.trim() === '') {
      alert('⚠️ Aucun utilisateur spécifié');
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId.trim())) {
      alert('❌ Format UUID invalide');
      return;
    }
    try {
      const { error } = await supabase
        .from('translation_tasks')
        .update({
          assigned_to: userId.trim(),
          assigned_at: new Date().toISOString(),
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      if (error) throw error;
      alert('✅ Tâche assignée avec succès');
      loadTasks();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleValidate = async (task: TranslationTask) => {
    if (!currentUser) return;
    if (!confirm(`Valider la traduction de "${task.manuscript_title}" et transmettre à D8 ?`)) return;
    try {
      await supabase
        .from('translation_tasks')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      if (task.book_id) {
        await supabase
          .from('ztf_books')
          .update({
            ztf_status: 'TRANSLATED',
            status: 'TRANSLATED',
            current_department: 'D8',
            updated_at: new Date().toISOString()
          })
          .eq('id', task.book_id);
      }
      alert('✅ Manuscrit validé !\n\n📤 Transmis à D8 (Pré-BAT & BAT)');
      loadTasks();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleDeleteTask = async (task: TranslationTask) => {
    if (!confirm(`⚠️ Supprimer cette tâche de traduction ?`)) return;
    try {
      const { error } = await supabase
        .from('translation_tasks')
        .delete()
        .eq('id', task.id);
      if (error) throw error;
      alert('✅ Tâche supprimée');
      loadTasks();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress' || t.status.includes('pass_')).length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    validated: tasks.filter(t => t.status === 'validated').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  };

  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);

  if (editingTask) {
    return <TranslationEditor task={editingTask} onBack={() => { setEditingTask(null); loadTasks(); }} />;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du module D7...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-language"></i>
              Module D7 — Traduction
            </h1>
            <p className="text-purple-100 mt-2">
              Traduction Anglais → Français • Fidélité doctrinale ZTF • Double validation
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowStyleGuide(true)}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 flex items-center gap-2"
            >
              <i className="fas fa-book"></i>
              Guide de Style
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-purple-100">En attente</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-purple-100">En cours</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.submitted}</p>
            <p className="text-xs text-purple-100">Soumis</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{stats.validated}</p>
            <p className="text-xs text-purple-100">Validés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
            <p className="text-xs text-purple-100">Rejetés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-purple-100">Total</p>
          </div>
        </div>
      </div>

      {/* Règles métier */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            Règles métier D7
          </span>
          <i className={`fas fa-chevron-${showRules ? 'up' : 'down'} text-amber-600 dark:text-amber-400 transition-transform`}></i>
        </button>
        {showRules && (
          <div className="px-4 pb-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 pt-3">
              <li>• <strong>Traduction fidèle</strong> : préserver le style et la profondeur doctrinale ZTF</li>
              <li>• <strong>7 passes obligatoires</strong> : Lecture → Compréhension → Terminologie → 1ère traduction → Révision → Contrôle doctrinal → Contrôle linguistique</li>
              <li>• <strong>Glossaire ZTF bilingue</strong> : termes doctrinaux validés</li>
              <li>• <strong>Versions bibliques correspondantes</strong> : NIV ↔ Bible du Semeur, KJV ↔ Louis Segond 1910</li>
              <li>• <strong>Révision croisée</strong> : chaque traduction relue par un second traducteur</li>
              <li>• <strong>Validation linguistique ET doctrinale</strong> obligatoire avant livraison à D8</li>
              <li>• DeepL est un outil d'assistance — la décision finale reste toujours humaine</li>
            </ul>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Tous ({stats.total})
          </button>
          {Object.entries(TRANSLATION_STATUS_CONFIG).map(([status, config]) => {
            const count = tasks.filter(t => t.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${statusFilter === status ? `${config.color} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <i className={`fas ${config.icon}`}></i>
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Erreur */}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thème</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigné à</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mots</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <i className="fas fa-language text-5xl mb-4 block opacity-50"></i>
                    Aucune tâche de traduction
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const statusConfig = TRANSLATION_STATUS_CONFIG[task.status];
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                          {task.book?.ztf_id || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {task.manuscript_title || task.book?.title || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {task.manuscript_theme || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {task.assigned_user?.full_name || 'Non assigné'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {task.current_pass > 0 ? `Passe ${task.current_pass}/7` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${statusConfig.color}`}>
                          <i className={`fas ${statusConfig.icon} mr-1`}></i>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {task.word_count?.toLocaleString('fr-FR') || 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-edit"></i>
                            Éditer
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleAssignTask(task.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
                            >
                              <i className="fas fa-user-plus"></i>
                              Assigner
                            </button>
                          )}
                          {task.status === 'submitted' && (isAdmin() || isChefD7()) && (
                            <button
                              onClick={() => handleValidate(task)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                            >
                              <i className="fas fa-check"></i>
                              Valider
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm flex items-center gap-1"
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

      {/* Modal Guide de Style */}
      {showStyleGuide && <StyleGuide onClose={() => setShowStyleGuide(false)} />}
    </div>
  );
}