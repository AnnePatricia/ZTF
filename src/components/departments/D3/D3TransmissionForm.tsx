// src/components/departments/D3/D3TransmissionForm.tsx
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useRoles } from '../../../hooks/useRoles';
import type { CleaningTask } from '../../../types/cleaning';

interface D3TransmissionFormProps {
  task: CleaningTask;
  onBack: () => void;
}

export default function D3TransmissionForm({ task, onBack }: D3TransmissionFormProps) {
  const { currentUser, isChefD3, isAdmin } = useRoles();
  const [interventions, setInterventions] = useState<string[]>(['']);
  const [flaggedPassages, setFlaggedPassages] = useState<string[]>(['']);
  const [annotationsSummary, setAnnotationsSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ✅ CORRECTION : Appeler les fonctions avec () pour obtenir un booléen
  const canSign = isChefD3() || isAdmin();

  const handleSubmit = async () => {
    if (!currentUser) return;

    // ✅ Vérification du rôle
    if (!canSign) {
      alert('❌ Seul le Chef Nettoyage (D3) peut signer et transmettre à D4');
      return;
    }

    if (!confirm('Signer et transmettre ce livre au département D4 ?')) return;

    setSubmitting(true);
    try {
      // 1. Créer la fiche de transmission D3
      const { error: transmissionError } = await supabase
        .from('d3_transmissions')
        .insert({
          task_id: task.id,
          book_id: task.book_id,
          from_user: currentUser.id,
          to_department: 'D4',
          interventions: interventions.filter(i => i.trim()),
          flagged_passages: flaggedPassages.filter(p => p.trim()),
          annotations_summary: annotationsSummary || null,
          notes: notes || null,
          signed_at: new Date().toISOString()
        });

      if (transmissionError) throw transmissionError;

      // 2. Mettre à jour le statut du livre à CLEANED
      const { error: bookError } = await supabase
        .from('ztf_books')
        .update({
          ztf_status: 'CLEANED',
          status: 'CLEANED',
          current_department: 'D4',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.book_id);

      if (bookError) throw bookError;

      // 3. Créer la tâche D4 (Éditorialisation)
      const { error: d4Error } = await supabase
        .from('editorialization_tasks')
        .insert({
          book_id: task.book_id,
          source_task_id: task.id,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (d4Error) throw d4Error;

      alert('✅ Fiche de transmission créée — D4 a été notifié\n\n📤 Le livre est transmis à D4 (Éditorialisation)');
      onBack();
    } catch (err: any) {
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => [...prev, '']);

  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) =>
    setter(prev => prev.map((item, i) => i === index ? value : item));

  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) =>
    setter(prev => prev.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <i className="fas fa-file-signature"></i>
          Fiche de Transmission D3 → D4
        </h1>
        <p className="text-emerald-100 mt-2">{task.book?.title} • {task.book?.ztf_id}</p>
      </div>

      {/* ✅ Alerte si l'utilisateur n'a pas les droits */}
      {!canSign && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <strong>Accès restreint :</strong> Seul le Chef Nettoyage (D3) peut signer et transmettre ce livre à D4.
          <br />
          <span className="text-sm">Votre rôle actuel ne permet pas cette action.</span>
        </div>
      )}

      {/* Informations de transmission */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Département expéditeur</p>
            <p className="font-bold">D3 — Nettoyage Éditorial</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Département destinataire</p>
            <p className="font-bold">D4 — Éditorialisation</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Signataire</p>
            <p className="font-bold">{currentUser?.full_name || 'Non connecté'}</p>
            <p className="text-xs text-gray-500">
              {canSign ? '✅ Autorisé à signer' : '❌ Non autorisé'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {/* Interventions effectuées */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-tasks text-emerald-600"></i>
          Interventions effectuées
        </h3>
        <div className="space-y-2">
          {interventions.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateField(setInterventions, i, e.target.value)}
                placeholder="Ex: Nettoyage orthographique complet"
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
            className="text-sm text-emerald-600 hover:text-emerald-800"
          >
            <i className="fas fa-plus mr-1"></i>
            Ajouter
          </button>
        </div>
      </div>

      {/* Passages signalés */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-orange-600"></i>
          Passages signalés
        </h3>
        <div className="space-y-2">
          {flaggedPassages.map((item, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={item}
                onChange={(e) => updateField(setFlaggedPassages, i, e.target.value)}
                placeholder="Ex: Passage à vérifier..."
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
            className="text-sm text-emerald-600 hover:text-emerald-800"
          >
            <i className="fas fa-plus mr-1"></i>
            Ajouter
          </button>
        </div>
      </div>

      {/* Résumé des annotations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-sticky-note text-yellow-600"></i>
          Résumé des annotations
        </h3>
        <textarea
          value={annotationsSummary}
          onChange={(e) => setAnnotationsSummary(e.target.value)}
          placeholder="Synthèse des annotations..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          rows={3}
        />
      </div>

      {/* Notes pour D4 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-comment text-blue-600"></i>
          Notes pour D4
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          rows={4}
        />
      </div>

      {/* Boutons d'action */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex justify-end gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
        >
          Annuler
        </button>
        {/* ✅ Bouton désactivé si l'utilisateur n'est pas Chef D3 */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSign}
          className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 ${
            canSign
              ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
          title={!canSign ? 'Seul le Chef Nettoyage (D3) peut signer' : ''}
        >
          <i className="fas fa-paper-plane"></i>
          {submitting ? 'Envoi...' : 'Signer et transmettre à D4'}
        </button>
      </div>
    </div>
  );
}