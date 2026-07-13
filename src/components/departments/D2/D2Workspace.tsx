// src/components/departments/D2/D2Workspace.tsx
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useTranscription } from '../../../hooks/useTranscription';
import { useRoles } from '../../../hooks/useRoles';
import TranscriptionEditor from './TranscriptionEditor';
import { isAudioVideo, isDocument } from '../../../utils/fileTypeUtils';
import type { TranscriptionTask } from '../../../types/transcription';
// import type { ZtfUser } from '../../../types/ztf';
import { testFullWorkflow } from '../../../utils/workflowTest';

interface D2WorkspaceProps {
  department?: string;
  readOnly?: boolean;
}

export default function D2Workspace({
  readOnly = false,
}: D2WorkspaceProps) {
  // ✅ Récupérer les rôles directement depuis useRoles
  const { currentUser, isAdmin, isChef } = useRoles();
  const { tasks, loading, error, refresh, deleteTask } = useTranscription();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<TranscriptionTask | null>(null);
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
      .select(`
        id, 
        title, 
        status, 
        ztf_status,
        raw_file:raw_files(file_type, mime_type)
      `)
      .eq('ztf_id', bookId)
      .maybeSingle();

    if (fetchError || !book) {
      alert(` Livre "${bookId}" non trouvé`);
      return;
    }

    const fileType = book.raw_file?.[0]?.file_type || '';
    const mimeType = book.raw_file?.[0]?.mime_type || '';

    if (isAudioVideo(fileType, mimeType)) {
      const redirect = confirm(
        '⚠️ Ce fichier est un AUDIO/VIDEO.\n\n' +
        'Il doit obligatoirement passer par D1 (Analyse et Transcription) avant d\'arriver en D2.\n\n' +
        'Voulez-vous aller en D1 maintenant ?'
      );
      if (redirect) {
        window.location.href = '/d1';
      }
      return;
    }

    if (!isDocument(fileType, mimeType)) {
      alert(`❌ Type de fichier non supporté en D2: ${fileType || 'inconnu'}`);
      return;
    }

    if (book.ztf_status !== 'DRAFT' && book.ztf_status !== 'TRANSCRIBED') {
      alert(`❌ Le livre "${bookId}" n'est pas au statut DRAFT. Statut actuel : ${book.ztf_status}`);
      return;
    }

    const { data: existing } = await supabase
      .from('transcription_tasks')
      .select('id')
      .eq('book_id', book.id)
      .maybeSingle();

    if (existing) {
      alert(`⚠️ Une tâche de transcription existe déjà pour "${bookId}"`);
      return;
    }

    const { error: insertError } = await supabase
      .from('transcription_tasks')
      .insert({
        book_id: book.id,
        status: 'pending',
        transcription_level: 1
      });

    if (insertError) {
      alert(' Erreur: ' + insertError.message);
      return;
    }

    alert(`✅ Tâche de transcription créée pour "${book.title}" !`);
    refresh();
  };

  const handleValidate = async (task: TranscriptionTask) => {
    if (!currentUser) {
      alert('❌ Vous devez être connecté pour valider');
      return;
    }

    if (!task.transcription_content || task.transcription_content.trim() === '') {
      alert('❌ La transcription est vide.');
      return;
    }

    if (task.assigned_to === currentUser.id) {
      alert('❌ Un transcripteur ne peut pas valider sa propre transcription.');
      return;
    }

    if (!confirm(`Valider la transcription "${task.book?.ztf_id}" et la transmettre à D3 ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('transcription_tasks')
        .update({
          status: 'verified',
          verified_by: currentUser.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      await supabase
        .from('ztf_books')
        .update({
          ztf_status: 'TRANSCRIBED',
          status: 'TRANSCRIBED',
          current_department: 'D3',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.book_id);

      await supabase
        .from('cleaning_tasks')
        .insert({
          book_id: task.book_id,
          status: 'pending',
          source_task_id: task.id,
          created_at: new Date().toISOString()
        });

      alert(`✅ Transcription validée !\n\n📤 Le livre est transmis à D3 (Nettoyage Éditorial)\n📋 Fiche de transmission générée automatiquement`);
      refresh();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleStart = async (task: TranscriptionTask) => {
    if (!currentUser) {
      alert('❌ Vous devez être connecté');
      return;
    }

    let transcriptionContent = task.transcription_content || '';
    if (!transcriptionContent && task.book_id) {
      try {
        const { data: book, error: bookError } = await supabase
          .from('ztf_books')
          .select('content, ztf_id, raw_file_id')
          .eq('id', task.book_id)
          .single();

        if (bookError) {
          console.error('Erreur chargement contenu:', bookError);
        } else if (book?.content) {
          transcriptionContent = book.content;
        }
      } catch (err) {
        console.error('Erreur chargement contenu livre:', err);
      }
    }

    const updateData: any = {
      status: 'in_progress',
      assigned_to: currentUser.id,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (transcriptionContent) {
      updateData.transcription_content = transcriptionContent;
    }

    const { error } = await supabase
      .from('transcription_tasks')
      .update(updateData)
      .eq('id', task.id);

    if (error) {
      alert('❌ Erreur: ' + error.message);
      return;
    }

    alert(`✅ Transcription "${task.book?.ztf_id}" démarrée !`);

    const { data: updatedTask } = await supabase
      .from('transcription_tasks')
      .select(`
        *,
        book:ztf_books(id, ztf_id, title, content)
      `)
      .eq('id', task.id)
      .single();

    setEditingTask(updatedTask);
    refresh();
  };

  const handleEdit = (task: TranscriptionTask) => {
    setEditingTask(task);
  };

  const handleSubmit = async (task: TranscriptionTask) => {
    if (!currentUser) {
      alert('❌ Vous devez être connecté');
      return;
    }

    if (!task.transcription_content || task.transcription_content.trim() === '') {
      alert('❌ La transcription est vide.');
      return;
    }

    const { error } = await supabase
      .from('transcription_tasks')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);

    if (error) {
      alert('❌ Erreur: ' + error.message);
      return;
    }

    alert(`✅ Transcription "${task.book?.ztf_id}" soumise pour validation !`);
    refresh();
  };

  const handleDeleteTask = async (task: TranscriptionTask) => {
    if (!confirm(`⚠️ Supprimer la transcription "${task.book?.ztf_id}" ?`)) return;
    const success = await deleteTask(task.id);
    if (success) alert('✅ Tâche supprimée');
  };

  const handleCloseEditor = () => {
    setEditingTask(null);
    refresh();
  };

  if (editingTask) {
    return <TranscriptionEditor task={editingTask} onBack={handleCloseEditor} />;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du module D2...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-keyboard"></i>
              Module D2 — Transcription Validée
            </h1>
            <p className="text-blue-100 mt-2">
              Production de transcriptions fidèles au style ZTF • Niveaux 1 & 2
            </p>
          </div>
          {!readOnly && (isChef() || isAdmin()) && (
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50"
            >
              Nouvelle tâche
            </button>
          )}
          {isAdmin() && process.env.NODE_ENV === 'development' && (
            <button
              onClick={async () => {
                const bookId = prompt('ID du livre à tester (UUID) :');
                if (!bookId) return;
                const result = await testFullWorkflow(bookId);
                if (result.success) {
                  alert('✅ Workflow complet testé avec succès !');
                } else {
                  alert('❌ Erreur: ' + result.error);
                }
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              Tester workflow complet
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-blue-100">En attente</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-blue-100">En cours</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.submitted}</p>
            <p className="text-xs text-blue-100">Soumises</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{stats.verified}</p>
            <p className="text-xs text-blue-100">Validées</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
            <p className="text-xs text-blue-100">Rejetées</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-blue-100">Total</p>
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
            Règles métier D2
          </span>
          <i className={`fas fa-chevron-${showRules ? 'up' : 'down'} text-amber-600 dark:text-amber-400 transition-transform`}></i>
        </button>
        {showRules && (
          <div className="px-4 pb-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 pt-3">
              <li>• <strong>Niveau 1</strong> : Transcription brute fidèle — mot pour mot, sans modification</li>
              <li>• <strong>Niveau 2</strong> : Transcription légèrement nettoyée (ponctuation, paragraphes)</li>
              <li>• La sortie IA ne peut jamais être publiée directement — révision humaine obligatoire</li>
              <li>• Un transcripteur ne peut pas valider sa propre transcription</li>
              <li>• Statut TRANSCRIBED attribué uniquement par le chef D2 ou le vérificateur</li>
              <li>• Fiche de transmission automatique générée à la validation</li>
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'all', label: 'Tous', color: 'blue', count: stats.total },
            { key: 'pending', label: 'En attente', color: 'amber', count: stats.pending },
            { key: 'in_progress', label: 'En cours', color: 'blue', count: stats.inProgress },
            { key: 'submitted', label: 'Soumise', color: 'orange', count: stats.submitted },
            { key: 'verified', label: 'Validée', color: 'green', count: stats.verified },
            { key: 'rejected', label: 'Rejetée', color: 'red', count: stats.rejected }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === f.key
                ? `bg-${f.color}-600 text-white`
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID ZTF</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niveau</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transcripteur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mots</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <i className="fas fa-keyboard text-5xl mb-4 block opacity-50"></i>
                    Aucune transcription
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                        {task.book?.ztf_id || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                        {task.book?.title || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${task.transcription_level === 2
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                        Niv. {task.transcription_level || 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {task.assigned_user?.full_name || 'Non assigné'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${task.status === 'pending' ? 'bg-amber-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'submitted' ? 'bg-orange-500' :
                            task.status === 'verified' ? 'bg-green-500' :
                              task.status === 'rejected' ? 'bg-red-500' :
                                'bg-gray-500'
                        }`}>
                        {task.status === 'pending' ? 'En attente' :
                          task.status === 'in_progress' ? 'En cours' :
                            task.status === 'submitted' ? 'Soumise' :
                              task.status === 'verified' ? 'Validée' :
                                task.status === 'rejected' ? 'Rejetée' : task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {task.word_count || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {task.status === 'pending' && !readOnly && (
                          <button
                            onClick={() => handleStart(task)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                          >
                            Démarrer
                          </button>
                        )}
                        {readOnly && (
                          <span className="px-2 py-1 text-xs bg-gray-100 rounded">Lecture seule</span>
                        )}
                        {(task.status === 'in_progress' || task.status === 'submitted') && (
                          <button
                            onClick={() => handleEdit(task)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-eye"></i>
                            Voir
                          </button>
                        )}
                        {task.status === 'in_progress' && task.assigned_to === currentUser?.id && (
                          <button
                            onClick={() => handleSubmit(task)}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-paper-plane"></i>
                            Soumettre
                          </button>
                        )}
                        {task.status === 'submitted' && currentUser && (isChef() || isAdmin()) && (
                          <button
                            onClick={() => handleValidate(task)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-check"></i>
                            Valider
                          </button>
                        )}
                        {(isChef() || isAdmin()) && (
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-300 rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}