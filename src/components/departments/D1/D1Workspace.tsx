// src/components/departments/D1/D1Workspace.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAnalysis } from '../../../hooks/useAnalysis';
import { useRoles } from '../../../hooks/useRoles';
import type { AnalysisTask } from '../../../hooks/useAnalysis';

interface D1WorkspaceProps {
  department?: string;
}

export default function D1Workspace({ }: D1WorkspaceProps = {}) {
  const { tasks, loading, error, refresh, createTask, startAnalysis, rejectAnalysis, deleteTask } = useAnalysis();
  const { isChef, isAdmin, currentUser } = useRoles();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [analyzingTask, setAnalyzingTask] = useState<AnalysisTask | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [qualityScore, setQualityScore] = useState<number>(80);
  const [analystNotes, setAnalystNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>('');
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [speakerCount, setSpeakerCount] = useState<number>(1);
  const [hasBackgroundNoise, setHasBackgroundNoise] = useState<boolean>(false);
  const [audioQuality, setAudioQuality] = useState<string>('good');
  const [showRules, setShowRules] = useState(false);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    validated: tasks.filter(t => t.status === 'validated').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  };

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  useEffect(() => {
    if (!analyzingTask) return;

    const loadPreview = async () => {
      if (analyzingTask.book?.raw_file_id) {
        const { data: rawFile } = await supabase
          .from('raw_files')
          .select('extracted_content')
          .eq('id', analyzingTask.book!.raw_file_id)
          .single();

        if (rawFile?.extracted_content) {
          setPreviewContent(rawFile.extracted_content.substring(0, 2000) + '...');
        }
      }

      if (analyzingTask.audio_file_id) {
        const { data: audioFile } = await supabase
          .from('raw_files')
          .select('file_url, file_name, file_type')
          .eq('id', analyzingTask.audio_file_id)
          .single();

        if (audioFile?.file_url) {
          setAudioPreviewUrl(audioFile.file_url);
          const audio = new Audio(audioFile.file_url);
          audio.addEventListener('loadedmetadata', () => {
            setAudioDuration(audio.duration);
          });
        }
      }
    };

    loadPreview();
  }, [analyzingTask]);

  const handleCreateTask = async () => {
    const bookId = prompt('ID ZTF du livre (ex: TRANS-2026-00001) :');
    if (!bookId) return;

    const { data: book, error: fetchError } = await supabase
      .from('ztf_books')
      .select('id, title, status')
      .eq('ztf_id', bookId)
      .maybeSingle();

    if (fetchError || !book) {
      alert(`❌ Livre "${bookId}" non trouvé`);
      return;
    }

    const { data: existing } = await supabase
      .from('analysis_tasks')
      .select('id')
      .eq('book_id', book.id)
      .maybeSingle();

    if (existing) {
      alert(`️ Une tâche d'analyse existe déjà pour "${bookId}"`);
      return;
    }

    try {
      await createTask(book.id);
      alert(`✅ Tâche d'analyse créée pour "${book.title}" !`);
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleStart = async (task: AnalysisTask) => {
    if (!currentUser) {
      alert('❌ Vous devez être connecté');
      return;
    }
    try {
      await startAnalysis(task.id, currentUser.id);
      setAnalyzingTask({ ...task, status: 'in_progress', assigned_to: currentUser.id });
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleValidate = async () => {
    if (!analyzingTask) return;

    const updateData: any = {
      status: 'validated',
      quality_score: qualityScore,
      analyst_notes: analystNotes,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (analyzingTask.book?.raw_file_id && previewContent) {
      const wordCount = previewContent.trim().split(/\s+/).filter(w => w).length;
      Object.assign(updateData, {
        content_length: previewContent.length,
        word_count: wordCount,
        has_tables: previewContent.includes('<table') || previewContent.includes('|'),
        has_images: previewContent.includes('<img'),
        has_special_chars: /[^\w\s.,;:!?'\"()-]/.test(previewContent)
      });
    }

    if (analyzingTask.audio_file_id) {
      Object.assign(updateData, {
        audio_duration: audioDuration,
        speaker_count: speakerCount,
        has_background_noise: hasBackgroundNoise,
        audio_quality: audioQuality,
        word_count: 0
      });
    }

    try {
      await supabase
        .from('analysis_tasks')
        .update(updateData)
        .eq('id', analyzingTask.id);

      if (analyzingTask.book_id) {
        await supabase
          .from('ztf_books')
          .update({ status: 'READY_FOR_TRANSCRIPTION', updated_at: new Date().toISOString() })
          .eq('id', analyzingTask.book_id);
      }

      alert(`✅ Analyse validée avec un score de ${qualityScore}/100`);
      setAnalyzingTask(null);
      setPreviewContent('');
      setAudioPreviewUrl('');
      setAnalystNotes('');
      setQualityScore(80);
      setAudioDuration(0);
      setSpeakerCount(1);
      setHasBackgroundNoise(false);
      setAudioQuality('good');

      await refresh();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleReject = async () => {
    if (!analyzingTask) return;
    if (!rejectionReason.trim()) {
      alert('❌ Veuillez indiquer une raison de rejet');
      return;
    }
    if (!confirm(`Rejeter l'analyse de "${analyzingTask.book?.ztf_id}" ?`)) return;

    try {
      await rejectAnalysis(analyzingTask.id, rejectionReason);
      alert('❌ Analyse rejetée');
      setAnalyzingTask(null);
      setRejectionReason('');
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleDeleteTask = async (task: AnalysisTask) => {
    if (!confirm(`⚠️ Supprimer l'analyse "${task.book?.ztf_id}" ?`)) return;
    try {
      await deleteTask(task.id);
      alert('✅ Tâche supprimée');
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  if (analyzingTask) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAnalyzingTask(null)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
              >
                <i className="fas fa-arrow-left"></i>
                Retour
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Analyse : {analyzingTask.book?.ztf_id || analyzingTask.audio_file?.file_name}
                </h2>
                <p className="text-sm text-gray-500">{analyzingTask.book?.title || 'Fichier audio'}</p>
              </div>
            </div>
          </div>
        </div>

        {analyzingTask.audio_file_id && audioPreviewUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i className="fas fa-headphones text-purple-600"></i>
              Fichier audio
            </h3>

            <audio controls src={audioPreviewUrl} className="w-full mb-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500">Durée</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.floor(audioDuration / 60)}:{String(Math.floor(audioDuration % 60)).padStart(2, '0')}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre de locuteurs</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={speakerCount}
                  onChange={(e) => setSpeakerCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Qualité audio</label>
                <select
                  value={audioQuality}
                  onChange={(e) => setAudioQuality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="excellent">Excellente</option>
                  <option value="good">Bonne</option>
                  <option value="fair">Moyenne</option>
                  <option value="poor">Mauvaise</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="backgroundNoise"
                  checked={hasBackgroundNoise}
                  onChange={(e) => setHasBackgroundNoise(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="backgroundNoise" className="text-sm text-gray-700 dark:text-gray-300">
                  Bruit de fond
                </label>
              </div>
            </div>
          </div>
        )}

        {analyzingTask.book?.raw_file_id && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i className="fas fa-file-alt text-blue-600"></i>
              Aperçu du contenu extrait
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {previewContent || 'Aucun contenu extrait disponible'}
              </pre>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              {previewContent.length > 0 && (
                <span>
                  {previewContent.trim().split(/\s+/).filter(w => w).length.toLocaleString('fr-FR')} mots • {previewContent.length.toLocaleString('fr-FR')} caractères
                </span>
              )}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-star text-yellow-500"></i>
            Évaluation de la qualité
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Score de qualité : {qualityScore}/100
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={qualityScore}
              onChange={(e) => setQualityScore(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 - Inutilisable</span>
              <span>50 - Moyen</span>
              <span>100 - Excellent</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes pour le transcripteur
            </label>
            <textarea
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              placeholder="Points particuliers, difficultés anticipées, formatage spécial..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={4}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex justify-between gap-3">
            <button
              onClick={handleReject}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2"
            >
              <i className="fas fa-times"></i>
              Rejeter
            </button>
            <button
              onClick={handleValidate}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2"
            >
              <i className="fas fa-check"></i>
              Valider l'analyse
            </button>
          </div>

          {analyzingTask.status === 'in_progress' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Raison du rejet (si applicable)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Format incorrect, qualité insuffisante, fichier corrompu..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du module D1...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-search"></i>
              Module D1 — Ingestion & Archivage
            </h1>
            <p className="text-indigo-100 mt-2">
              Vérification de la qualité des fichiers avant transcription
            </p>
          </div>
          {(isChef() || isAdmin() || (currentUser?.role as string) === 'chef' || (currentUser?.role as string) === 'admin') && (
            <button
              onClick={handleCreateTask}
              className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg px-4 py-3 font-semibold flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Nouvelle tâche
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-indigo-100">En attente</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-indigo-100">En cours</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{stats.validated}</p>
            <p className="text-xs text-indigo-100">Validées</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
            <p className="text-xs text-indigo-100">Rejetées</p>
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
            Règles métier D1
          </span>
          <i className={`fas fa-chevron-${showRules ? 'up' : 'down'} text-amber-600 dark:text-amber-400 transition-transform`}></i>
        </button>
        {showRules && (
          <div className="px-4 pb-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 pt-3">
              <li>• <strong>Vérifier la qualité du contenu extrait</strong> avant de lancer la transcription</li>
              <li>• Score minimum de 60/100 pour passer à D2</li>
              <li>• Tout fichier rejeté doit être réimporté dans D0 après correction</li>
              <li>• Les notes d'analyse sont transmises au transcripteur en D2</li>
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            En attente ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'in_progress' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            En cours ({stats.inProgress})
          </button>
          <button
            onClick={() => setStatusFilter('validated')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'validated' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Validée ({stats.validated})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Rejetée ({stats.rejected})
          </button>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Analyste</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <i className="fas fa-search text-5xl mb-4 block opacity-50"></i>
                    Aucune analyse
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-mono bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded">
                        {task.book?.ztf_id || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                        {task.book?.title || task.audio_file?.file_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {task.assigned_user?.full_name || 'Non assigné'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${task.status === 'pending' ? 'bg-amber-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                            task.status === 'validated' ? 'bg-green-500' :
                              task.status === 'rejected' ? 'bg-red-500' :
                                'bg-gray-500'
                        }`}>
                        {task.status === 'pending' ? 'En attente' :
                          task.status === 'in_progress' ? 'En cours' :
                            task.status === 'validated' ? 'Validée' :
                              task.status === 'rejected' ? 'Rejetée' : task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {task.quality_score !== null ? (
                        <span className={`font-bold ${task.quality_score >= 80 ? 'text-green-600' :
                            task.quality_score >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                          }`}>
                          {task.quality_score}/100
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStart(task)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-play"></i>
                            Démarrer
                          </button>
                        )}

                        {(task.status === 'in_progress' || task.status === 'validated' || task.status === 'rejected') && (
                          <button
                            onClick={() => setAnalyzingTask(task)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-eye"></i>
                            Voir
                          </button>
                        )}

                        {(isChef() || isAdmin() || (currentUser?.role as string) === 'chef' || (currentUser?.role as string) === 'admin') && (
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