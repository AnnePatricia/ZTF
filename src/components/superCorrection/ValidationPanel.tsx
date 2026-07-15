// src/components/superCorrection/ValidationPanel.tsx
import { useState } from 'react';
// import { supabase } from '../../supabaseClient';
import { useSuperCorrection } from '../../hooks/useSuperCorrection';

interface ValidationPanelProps {
  scBookId: string;
  readingProgress: number;
  onValidated: () => void;
}

export default function ValidationPanel({ scBookId, readingProgress, onValidated }: ValidationPanelProps) {
  const { validateBook } = useSuperCorrection();
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');
  const [validating, setValidating] = useState(false);

  const canValidate = readingProgress >= 100;

  const handleValidate = async () => {
    if (!canValidate) {
      alert(`❌ Vous devez lire 100% du document avant de valider.\nProgression actuelle: ${readingProgress}%`);
      return;
    }

    setValidating(true);
    try {
      const result = await validateBook(scBookId, validationNotes);
      if (result.success) {
        if (result.isLocked) {
          alert('✅ Livre validé et VERROUILLÉ automatiquement !\n\nLe seuil de validation a été atteint.');
        } else {
          alert('✅ Votre validation a été enregistrée.');
        }
        onValidated();
      } else {
        alert(`❌ Erreur: ${result.error}`);
      }
    } catch (err: any) {
      alert(' Erreur: ' + err.message);
    } finally {
      setValidating(false);
      setShowValidationModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowValidationModal(true)}
        disabled={!canValidate}
        className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
          canValidate
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <i className="fas fa-check-circle"></i>
        Valider ce livre
      </button>

      {showValidationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Validation du livre
            </h3>
            
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <i className="fas fa-check-circle mr-2"></i>
                  Vous avez lu 100% du document et pouvez maintenant valider.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes de validation (optionnel)
                </label>
                <textarea
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Commentaires généraux sur le livre..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  rows={4}
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <i className="fas fa-info-circle mr-1"></i>
                  Une fois validé, vous ne pourrez plus modifier votre validation.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowValidationModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
              >
                {validating ? 'Validation...' : 'Confirmer la validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}