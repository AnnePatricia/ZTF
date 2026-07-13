// src/components/departments/D4/D4Workspace.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useRoles } from '../../../hooks/useRoles';
import { EDITORIALIZATION_STATUS_CONFIG } from '../../../types/editorialization';
import type { EditorializationTask } from '../../../types/editorialization';
import ManuscriptEditor from './ManuscriptEditor';
import BookViewer from './BookViewer';

interface D4WorkspaceProps {
  department?: string;
  readOnly?: boolean;
}

export default function D4Workspace({ readOnly = false }: D4WorkspaceProps) {
  const { currentUser, isAdmin, isChef, isChefD4 } = useRoles();
  const [tasks, setTasks] = useState<EditorializationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<EditorializationTask | null>(null);
  const [viewingTask, setViewingTask] = useState<EditorializationTask | null>(null);
  const [activeTab, setActiveTab] = useState<'d3' | 'd4'>('d3');
  const [showRules, setShowRules] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('editorialization_tasks')
        .select(`
          *,
          book:ztf_books(id, ztf_id, title, theme, language),
          assigned_user:ztf_users!assigned_to(full_name, email)
        `)
        .order('created_at', { ascending: false });

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

  const handleCreateTask = async () => {
    const bookId = prompt('ID ZTF du livre (ex: TRANS-2026-00001) :');
    if (!bookId) return;

    const { data: book, error: fetchError } = await supabase
      .from('ztf_books')
      .select('id, ztf_status, title')
      .eq('ztf_id', bookId)
      .single();

    if (fetchError || !book) {
      alert(`❌ Livre "${bookId}" non trouvé`);
      return;
    }

    if (book.ztf_status !== 'CLEANED' && book.ztf_status !== 'D3') {
      alert(`❌ Le livre "${bookId}" n'est pas au statut CLEANED.\nStatut actuel : ${book.ztf_status}\n\nVeuillez d'abord valider le nettoyage dans D3.`);
      return;
    }

    const { data: existing } = await supabase
      .from('editorialization_tasks')
      .select('id')
      .eq('book_id', book.id)
      .maybeSingle();

    if (existing) {
      alert(`⚠️ Une tâche d'éditorialisation existe déjà pour "${bookId}"`);
      return;
    }

    const { error: insertError } = await supabase
      .from('editorialization_tasks')
      .insert({
        book_id: book.id,
        manuscript_title: book.title,
        status: 'pending',
        structure_plan: [],
        selected_fragments: [],
        created_at: new Date().toISOString()
      });

    if (insertError) {
      alert('❌ Erreur: ' + insertError.message);
      return;
    }

    alert(`✅ Tâche d'éditorialisation créée pour "${book.title}" !`);
    loadTasks();
  };

  const handleCreateNewManuscript = async () => {
    if (!currentUser) {
      alert('❌ Vous devez être connecté');
      return;
    }

    const manuscriptTitle = prompt('Titre du nouveau manuscrit :');
    if (!manuscriptTitle) return;

    const manuscriptTheme = prompt('Thème principal (ex: Prière, Foi, Sainteté) :') || '';

    try {
      const { data, error } = await supabase
        .from('editorialization_tasks')
        .insert({
          book_id: null,
          manuscript_title: manuscriptTitle,
          manuscript_theme: manuscriptTheme || null,
          status: 'in_progress',
          assigned_to: currentUser.id,
          structure_plan: [],
          selected_fragments: [],
          manuscript_content: '',
          word_count: 0,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          book:ztf_books(id, ztf_id, title, theme, language),
          assigned_user:ztf_users!assigned_to(full_name, email)
        `)
        .single();

      if (error) throw error;

      alert(`✅ Nouveau manuscrit "${manuscriptTitle}" créé !\n\nVous pouvez maintenant sélectionner des fragments de différents livres D3.`);
      setEditingTask(data as EditorializationTask);
      loadTasks();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  // ✅ CORRECTION : Création automatique de la tâche D5 lors de la validation
  const handleValidate = async (task: EditorializationTask) => {
    if (!currentUser) return;
    if (!confirm(`Valider le manuscrit "${task.manuscript_title}" et le transmettre à D5 ?`)) return;

    try {
      // 1. Mettre à jour le statut de la tâche D4
      await supabase
        .from('editorialization_tasks')
        .update({
          status: 'validated',
          validated_by: currentUser.id,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      // 2. Mettre à jour le livre (si c'est un livre D3)
      if (task.book_id) {
        await supabase
          .from('ztf_books')
          .update({
            ztf_status: 'STRUCTURED',
            status: 'STRUCTURED',
            current_department: 'D5',
            updated_at: new Date().toISOString()
          })
          .eq('id', task.book_id);
      }

      // ✅ 3. CRÉER AUTOMATIQUEMENT la tâche D5 (Réécriture)
      const { error: d5Error } = await supabase
        .from('rewriting_tasks')
        .insert({
          book_id: task.book_id,
          source_task_id: task.id,
          original_content: task.manuscript_content,
          manuscript_title: task.manuscript_title,
          manuscript_theme: task.manuscript_theme,
          word_count: task.word_count || 0,
          status: 'pending',
          current_pass: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (d5Error) {
        console.error('Erreur création tâche D5:', d5Error);
        throw d5Error;
      }

      alert(`✅ Manuscrit validé !\n\n📤 Le livre est transmis à D5 (Réécriture & Style ZTF)`);
      loadTasks();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleDeleteTask = async (task: EditorializationTask) => {
    if (!confirm(`⚠️ Supprimer la tâche d'éditorialisation "${task.manuscript_title}" ?`)) return;

    const { error } = await supabase
      .from('editorialization_tasks')
      .delete()
      .eq('id', task.id);

    if (error) {
      alert('❌ Erreur: ' + error.message);
      return;
    }

    alert('✅ Tâche supprimée');
    loadTasks();
  };

  const booksFromD3 = tasks.filter(t => t.book_id !== null);
  const manuscriptsFromD4 = tasks.filter(t => t.book_id === null);

  const currentTasks = activeTab === 'd3' ? booksFromD3 : manuscriptsFromD4;

  const stats = {
    total: currentTasks.length,
    pending: currentTasks.filter(t => t.status === 'pending').length,
    inProgress: currentTasks.filter(t => t.status === 'in_progress').length,
    submitted: currentTasks.filter(t => t.status === 'submitted').length,
    validated: currentTasks.filter(t => t.status === 'validated').length,
    rejected: currentTasks.filter(t => t.status === 'rejected').length,
  };

  const filteredTasks = statusFilter === 'all'
    ? currentTasks
    : currentTasks.filter(t => t.status === statusFilter);

  if (editingTask) {
    return <ManuscriptEditor task={editingTask} onBack={() => { setEditingTask(null); loadTasks(); }} />;
  }

  if (viewingTask) {
    return <BookViewer task={viewingTask} onBack={() => setViewingTask(null)} />;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du module D4...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-sitemap"></i>
              Module D4 — Éditorialisation
            </h1>
            <p className="text-indigo-100 mt-2">
              Assemblage thématique et structuration en manuscrits (200-500 pages)
            </p>
          </div>
          {!readOnly && (isChef() || isChefD4() || isAdmin()) && (
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Ajouter un livre
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-indigo-100">En attente</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-indigo-100">En cours</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.submitted}</p>
            <p className="text-xs text-indigo-100">Soumis</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{stats.validated}</p>
            <p className="text-xs text-indigo-100">Validés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
            <p className="text-xs text-indigo-100">Rejetés</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-indigo-100">Total</p>
          </div>
        </div>
      </div>

      {/* Règles métier repliables */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            Règles métier D4
          </span>
          <i className={`fas fa-chevron-${showRules ? 'up' : 'down'} text-amber-600 dark:text-amber-400 transition-transform`}></i>
        </button>
        {showRules && (
          <div className="px-4 pb-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 pt-3">
              <li>• <strong>Échelle du livre complet</strong> — jamais à la page isolée</li>
              <li>• Chaque fragment placé doit référencer sa source exacte (livre D3 d'origine)</li>
              <li>• Sélection et évaluation des fragments : essentiel / complémentaire / hors-sujet</li>
              <li>• Constructeur de plan : parties / chapitres / sections</li>
              <li>• Signature du Directeur éditorial requise avant livraison à D5</li>
            </ul>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => { setActiveTab('d3'); setStatusFilter('all'); }}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'd3'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-book"></i>
            Livres provenant de D3 ({booksFromD3.length})
          </button>
          <button
            onClick={() => { setActiveTab('d4'); setStatusFilter('all'); }}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'd4'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-file-alt"></i>
            Manuscrits créés dans D4 ({manuscriptsFromD4.length})
          </button>
        </div>

        {/* Filtres de statut */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              Tous ({stats.total})
            </button>
            {Object.entries(EDITORIALIZATION_STATUS_CONFIG).map(([status, config]) => {
              const count = currentTasks.filter(t => t.status === status).length;
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
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                {activeTab === 'd3' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID ZTF</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre du manuscrit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thème</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Éditorialiste</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mots</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thème</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Éditorialiste</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mots</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <i className={`fas ${activeTab === 'd3' ? 'fa-book' : 'fa-file-alt'} text-5xl mb-4 block opacity-50`}></i>
                    {activeTab === 'd3' ? 'Aucun livre en éditorialisation' : 'Aucun manuscrit créé'}
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const statusConfig = EDITORIALIZATION_STATUS_CONFIG[task.status as keyof typeof EDITORIALIZATION_STATUS_CONFIG];
                  const realWordCount = (task as any).cleaning_task?.word_count_cleaned
                    || (task.book as any)?.word_count
                    || task.word_count
                    || 0;

                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {activeTab === 'd3' ? (
                        <>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-mono bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded">
                              {task.book?.ztf_id || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                              {task.manuscript_title || task.book?.title || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {task.manuscript_theme || task.book?.theme || '—'}
                            </span>
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
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-semibold">
                            {realWordCount.toLocaleString('fr-FR')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => setViewingTask(task)}
                                className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm flex items-center gap-1 font-semibold"
                                title="Consulter le contenu du livre"
                              >
                                <i className="fas fa-eye"></i>
                                Consulter
                              </button>
                              {task.status === 'submitted' && (isChefD4() || isAdmin()) && (
                                <button
                                  onClick={() => handleValidate(task)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                                  title="Valider et transmettre à D5"
                                >
                                  <i className="fas fa-check"></i>
                                  Valider
                                </button>
                              )}
                              {task.status === 'validated' && (
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-sm flex items-center gap-1">
                                  <i className="fas fa-check-circle"></i>
                                  Livré à D5
                                </span>
                              )}
                              {(isChefD4() || isAdmin()) && task.status !== 'validated' && (
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
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                              {task.manuscript_title || '—'}
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
                            <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${statusConfig.color}`}>
                              <i className={`fas ${statusConfig.icon} mr-1`}></i>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-semibold">
                            {task.word_count?.toLocaleString('fr-FR') || 0}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => setEditingTask(task)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm flex items-center gap-1 font-semibold"
                              >
                                <i className="fas fa-edit"></i>
                                Éditer
                              </button>
                              {task.status === 'submitted' && (isChefD4() || isAdmin()) && (
                                <button
                                  onClick={() => handleValidate(task)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1 font-semibold"
                                  title="Valider et transmettre à D5"
                                >
                                  <i className="fas fa-check"></i>
                                  Valider
                                </button>
                              )}
                              {task.status === 'validated' && (
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-sm flex items-center gap-1">
                                  <i className="fas fa-check-circle"></i>
                                  Livré à D5
                                </span>
                              )}
                              {(isChefD4() || isAdmin()) && task.status !== 'validated' && (
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
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bouton "Créer un nouveau manuscrit" - uniquement sur l'onglet D4 */}
      {activeTab === 'd4' && !readOnly && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                <i className="fas fa-plus-circle text-indigo-600 mr-2"></i>
                Créer un nouveau manuscrit
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Assemblage de fragments provenant de plusieurs livres D3 pour former un nouveau livre
              </p>
            </div>
            <button
              onClick={handleCreateNewManuscript}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all hover:shadow-xl"
            >
              <i className="fas fa-plus"></i>
              Créer un nouveau manuscrit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}