// src/components/departments/D3/CleaningVerifier.tsx
import { useState, useEffect } from 'react';
import { useCleaning } from '../../../hooks/useCleaning';
import { useRoles } from '../../../hooks/useRoles';
import type { CleaningTask, CleaningAnnotation } from '../../../types/cleaning';
import { ANNOTATION_TYPE_CONFIG } from '../../../types/cleaning';
import D3TransmissionForm from './D3TransmissionForm';

interface CleaningVerifierProps {
  task: CleaningTask;
  onBack: () => void;
}

export default function CleaningVerifier({ task, onBack }: CleaningVerifierProps) {
  const { verifyCleaning, rejectCleaning, loadAnnotations, resolveAnnotation } = useCleaning();
  const { currentUser } = useRoles();
  const [annotations, setAnnotations] = useState<CleaningAnnotation[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showTransmissionForm, setShowTransmissionForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAnnotations(task.id).then(setAnnotations);
  }, [task.id, loadAnnotations]);

  const handleVerify = async () => {
    if (task.assigned_to === currentUser?.id) {
      alert('❌ Vous ne pouvez pas valider votre propre travail');
      return;
    }

    if (!confirm('Valider ce nettoyage et le transmettre à D4 ?')) return;

    setProcessing(true);
    const result = await verifyCleaning(task.id);
    
    if (result.success) {
      setShowTransmissionForm(true);
    } else {
      alert(`❌ ${result.error}`);
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('❌ Motif de rejet obligatoire');
      return;
    }

    if (!confirm('Rejeter ce nettoyage ?')) return;

    setProcessing(true);
    const success = await rejectCleaning(task.id, rejectReason);
    
    if (success) {
      alert('✅ Nettoyage rejeté');
      onBack();
    }
    setProcessing(false);
  };

  const handleResolveAnnotation = async (annotationId: string) => {
    const success = await resolveAnnotation(annotationId);
    if (success) {
      setAnnotations(prev => prev.map(a => 
        a.id === annotationId ? { ...a, resolved: true, resolved_at: new Date().toISOString() } : a
      ));
    }
  };

  if (showTransmissionForm) {
    return <D3TransmissionForm task={task} onBack={onBack} />;
  }

  const unresolvedCount = annotations.filter(a => !a.resolved).length;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i>
              Retour
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-user-check text-emerald-600"></i>
                Vérification — {task.book?.title}
              </h2>
              <p className="text-sm text-gray-500">
                {task.book?.ztf_id} • Nettoyeur : {task.assigned_user?.full_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {task.assigned_to === currentUser?.id && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            Vous ne pouvez pas valider votre propre travail
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-xs text-gray-500">Mots original</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{task.word_count_original}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-xs text-gray-500">Mots nettoyé</p>
          <p className="text-2xl font-bold text-emerald-600">{task.word_count_cleaned}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-xs text-gray-500">Checklist</p>
          <p className="text-2xl font-bold text-emerald-600">
            {(task.checklist || []).filter((c: any) => c.checked).length}/{(task.checklist || []).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <p className="text-xs text-gray-500">Annotations</p>
          <p className="text-2xl font-bold text-orange-600">{unresolvedCount} non résolues</p>
        </div>
      </div>

      {/* Contenu nettoyé */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Contenu nettoyé
        </h3>
        <div 
          className="prose dark:prose-invert max-w-none p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg max-h-[500px] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: task.cleaned_content || '<p>Aucun contenu</p>' }}
        />
      </div>

      {/* Annotations */}
      {annotations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-comment-dots text-orange-600"></i>
            Annotations ({unresolvedCount} non résolues)
          </h3>
          <div className="space-y-3">
            {annotations.map(ann => {
              const typeConfig = ANNOTATION_TYPE_CONFIG[ann.type];
              return (
                <div key={ann.id} className={`border rounded-lg p-3 ${ann.resolved ? 'bg-gray-50 dark:bg-gray-700/50 opacity-60' : 'bg-white dark:bg-gray-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs text-white rounded ${typeConfig.color}`}>
                          <i className={`fas ${typeConfig.icon} mr-1`}></i>
                          {typeConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">{ann.user?.full_name}</span>
                        {ann.resolved && <span className="text-xs text-green-600"><i className="fas fa-check-circle"></i> Résolu</span>}
                      </div>
                      {ann.original_text && (
                        <p className="text-sm text-red-600 dark:text-red-400 line-through mb-1">
                          Original : {ann.original_text}
                        </p>
                      )}
                      {ann.suggested_correction && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                          Suggestion : {ann.suggested_correction}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300">{ann.content}</p>
                    </div>
                    {!ann.resolved && (
                      <button
                        onClick={() => handleResolveAnnotation(ann.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      >
                        <i className="fas fa-check mr-1"></i>Résoudre
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Notes du nettoyeur</h4>
          <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{task.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Décision</h3>
        {!showRejectForm ? (
          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={processing || task.assigned_to === currentUser?.id}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <i className="fas fa-check-circle"></i>
              Valider et transmettre à D4
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <i className="fas fa-times-circle"></i>
              Rejeter
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Motif du rejet *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRejectForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Annuler</button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}