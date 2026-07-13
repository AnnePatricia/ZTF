// src/components/departments/D2/TransmissionForm.tsx
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useRoles } from '../../../hooks/useRoles';
import type { TranscriptionTask } from '../../../types/transcription';

interface TransmissionFormProps {
  task: TranscriptionTask;
  onBack: () => void;
}

export default function TransmissionForm({ task, onBack }: TransmissionFormProps) {
  const { currentUser } = useRoles();
  const [interventions, setInterventions] = useState<string[]>(['']);
  const [flaggedPassages, setFlaggedPassages] = useState<string[]>(['']);
  const [sourceReferences, setSourceReferences] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentUser) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('d2_transmissions').insert({
        task_id: task.id,
        book_id: task.book_id,
        from_user: currentUser.id,
        to_department: 'D3',
        interventions: interventions.filter(i => i.trim()),
        flagged_passages: flaggedPassages.filter(p => p.trim()),
        source_references: sourceReferences.filter(s => s.trim()),
        notes: notes || null,
        signed_at: new Date().toISOString()
      });

      if (error) throw error;

      alert('✅ Fiche de transmission créée — D3 a été notifié');
      onBack();
    } catch (err: any) {
      console.error('Erreur transmission:', err);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const updateField = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeField = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <i className="fas fa-file-signature"></i>
          Fiche de Transmission D2 → D3
        </h1>
        <p className="text-green-100 mt-2">
          {task.book?.title} • {task.book?.ztf_id}
        </p>
      </div>

      {/* Informations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Département expéditeur</p>
            <p className="font-bold text-gray-900 dark:text-white">D2 — Transcription</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Département destinataire</p>
            <p className="font-bold text-gray-900 dark:text-white">D3 — Nettoyage Éditorial</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Signataire</p>
            <p className="font-bold text-gray-900 dark:text-white">{currentUser?.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>

      {/* Interventions effectuées */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-tasks text-purple-600"></i>
          Interventions effectuées
        </h3>
        <div className="space-y-2">
          {interventions.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateField(setInterventions, i, e.target.value)}
                placeholder="Ex: Transcription fidèle du message du 13 mai 2026"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              {interventions.length > 1 && (
                <button
                  onClick={() => removeField(setInterventions, i)}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addField(setInterventions)}
            className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <i className="fas fa-plus"></i>
            Ajouter une intervention
          </button>
        </div>
      </div>

      {/* Passages signalés */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-orange-600"></i>
          Passages signalés (attention particulière)
        </h3>
        <div className="space-y-2">
          {flaggedPassages.map((item, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={item}
                onChange={(e) => updateField(setFlaggedPassages, i, e.target.value)}
                placeholder="Ex: Passage à 12:34 - audio peu audible"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={2}
              />
              {flaggedPassages.length > 1 && (
                <button
                  onClick={() => removeField(setFlaggedPassages, i)}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addField(setFlaggedPassages)}
            className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <i className="fas fa-plus"></i>
            Ajouter un passage
          </button>
        </div>
      </div>

      {/* Références sources */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-link text-blue-600"></i>
          Références des sources utilisées
        </h3>
        <div className="space-y-2">
          {sourceReferences.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateField(setSourceReferences, i, e.target.value)}
                placeholder="Ex: AUD_2026_05_13_001.mp3"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm"
              />
              {sourceReferences.length > 1 && (
                <button
                  onClick={() => removeField(setSourceReferences, i)}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addField(setSourceReferences)}
            className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <i className="fas fa-plus"></i>
            Ajouter une référence
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-sticky-note text-yellow-600"></i>
          Notes pour D3
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions particulières pour l'équipe de nettoyage..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex justify-end gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2"
        >
          <i className="fas fa-paper-plane"></i>
          {submitting ? 'Envoi...' : 'Signer et transmettre à D3'}
        </button>
      </div>
    </div>
  );
}