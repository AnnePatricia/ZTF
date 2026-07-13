// src/components/departments/D2/TranscriptionVerifier.tsx
import { useState } from 'react';
import { useTranscription } from '../../../hooks/useTranscription';
import { useRoles } from '../../../hooks/useRoles';
import type { TranscriptionTask } from '../../../types/transcription';
import { TRANSCRIPTION_LEVEL_LABELS } from '../../../types/transcription';
import TransmissionForm from './TransmissionForm';

interface TranscriptionVerifierProps {
  task: TranscriptionTask;
  onBack: () => void;
}

export default function TranscriptionVerifier({ task, onBack }: TranscriptionVerifierProps) {
  const { verifyTranscription, rejectTranscription } = useTranscription();
  const { currentUser } = useRoles();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showTransmissionForm, setShowTransmissionForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleVerify = async () => {
    // Règle métier : un transcripteur ne peut pas valider sa propre transcription
    if (task.assigned_to === currentUser?.id) {
      alert('❌ Vous ne pouvez pas valider votre propre transcription');
      return;
    }

    if (!confirm('Valider cette transcription et la transmettre à D3 ?')) return;

    setProcessing(true);
    const result = await verifyTranscription(task.id);
    
    if (result.success) {
      setShowTransmissionForm(true);
    } else {
      alert(`❌ ${result.error}`);
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('❌ Veuillez indiquer un motif de rejet');
      return;
    }

    if (!confirm('Rejeter cette transcription et la renvoyer au transcripteur ?')) return;

    setProcessing(true);
    const success = await rejectTranscription(task.id, rejectReason);
    
    if (success) {
      alert('✅ Transcription rejetée');
      onBack();
    }
    setProcessing(false);
  };

  const levelConfig = TRANSCRIPTION_LEVEL_LABELS[task.transcription_level as 1 | 2];

  if (showTransmissionForm) {
    return <TransmissionForm task={task} onBack={onBack} />;
  }

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
                <i className="fas fa-user-check text-green-600"></i>
                Vérification — {task.book?.title}
              </h2>
              <p className="text-sm text-gray-500">
                {task.book?.ztf_id} • {levelConfig.label} • Transcripteur : {task.assigned_user?.full_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte règle métier */}
      {task.assigned_to === currentUser?.id && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            Vous ne pouvez pas valider votre propre transcription
          </p>
        </div>
      )}

      {/* Informations de la transcription */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Informations de la transcription
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500">Niveau</p>
            <p className="font-bold text-gray-900 dark:text-white">{levelConfig.label}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500">Mots</p>
            <p className="font-bold text-gray-900 dark:text-white">{task.word_count.toLocaleString('fr-FR')}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500">IA utilisée</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {task.ai_used ? `Oui (${task.ai_percentage}%)` : 'Non'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500">Révision humaine</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {task.human_revision_done ? '✅ Oui' : '❌ Non'}
            </p>
          </div>
        </div>

        {task.notes && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
              Notes du transcripteur
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
              {task.notes}
            </p>
          </div>
        )}
      </div>

      {/* Contenu de la transcription */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Contenu de la transcription
        </h3>
        <div 
          className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-[500px] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: task.transcription_content || '<p>Contenu non disponible</p>' }}
        />
      </div>

      {/* Actions de vérification */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Décision de vérification
        </h3>

        {!showRejectForm ? (
          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={processing || task.assigned_to === currentUser?.id}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <i className="fas fa-check-circle"></i>
              Valider et transmettre à D3
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <i className="fas fa-times-circle"></i>
              Rejeter
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motif du rejet (obligatoire)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi cette transcription est rejetée..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <i className="fas fa-paper-plane"></i>
                Confirmer le rejet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}