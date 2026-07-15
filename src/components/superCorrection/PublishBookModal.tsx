// src/components/superCorrection/PublishBookModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSuperCorrection } from '../../hooks/useSuperCorrection';
import type { SuperCorrectionConfig } from '../../types/superCorrection';

interface PublishBookModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Statuts ZTF officiels avec leurs labels
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  TRANSCRIBED: 'Transcrit',
  CLEANED: 'Nettoyé',
  STRUCTURED: 'Structuré',
  REWRITTEN: 'Réécrit',
  CORRECTED: 'Corrigé',
  TRANSLATED: 'Traduit',
  BAT_PENDING: 'BAT en attente',
  BAT_APPROVED: 'BAT approuvé',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

// ✅ UTILISÉ pour les badges colorés dans la liste des livres
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  TRANSCRIBED: 'bg-blue-100 text-blue-700',
  CLEANED: 'bg-cyan-100 text-cyan-700',
  STRUCTURED: 'bg-indigo-100 text-indigo-700',
  REWRITTEN: 'bg-purple-100 text-purple-700',
  CORRECTED: 'bg-teal-100 text-teal-700',
  TRANSLATED: 'bg-pink-100 text-pink-700',
  BAT_PENDING: 'bg-orange-100 text-orange-700',
  BAT_APPROVED: 'bg-green-100 text-green-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

export default function PublishBookModal({ onClose, onSuccess }: PublishBookModalProps) {
  const { publishBook } = useSuperCorrection();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [config, setConfig] = useState<SuperCorrectionConfig>({
    validation_threshold: 3,
    expiry_days: 30,
    language: 'EN',
    invited_correctors: [],
  });
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoadingBooks(true);
    try {
      const { data, error } = await supabase
        .from('ztf_books')
        .select('*')
        .order('title');

      if (error) {
        console.error('Erreur chargement livres:', error);
        return;
      }

      setBooks(data || []);
    } catch (err: any) {
      console.error('Erreur:', err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleAddEmail = () => {
    if (newEmail && !invitedEmails.includes(newEmail)) {
      setInvitedEmails([...invitedEmails, newEmail]);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInvitedEmails(invitedEmails.filter(e => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      alert('⚠️ Veuillez sélectionner un livre');
      return;
    }
    setLoading(true);

    const result = await publishBook(selectedBookId, {
      ...config,
      invited_correctors: invitedEmails,
    });

    if (result.success) {
      onSuccess();
    } else {
      alert(`❌ Erreur: ${result.error}`);
    }

    setLoading(false);
  };

  const selectedBook = books.find(b => b.id === selectedBookId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Publier un livre en Super Correction
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sélection du livre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Livre à publier *
            </label>

            {loadingBooks ? (
              <div className="text-center py-4 text-gray-500">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Chargement des livres...
              </div>
            ) : books.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-amber-600 text-xl"></i>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Aucun livre disponible
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                      La base de données ne contient aucun livre. Vous devez d'abord créer ou importer des livres dans le module Documents.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.location.hash = '#documents';
                      }}
                      className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
                    >
                      <i className="fas fa-arrow-right mr-2"></i>
                      Aller au module Documents
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Liste des livres avec badges colorés */}
                <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                  {books.map(book => {
                    const status = book.ztf_status || 'DRAFT';
                    const isSelected = book.id === selectedBookId;
                    const statusLabel = STATUS_LABELS[status] || status;
                    // ✅ UTILISATION DE STATUS_COLORS pour les badges
                    const statusColorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
                    
                    return (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => setSelectedBookId(book.id)}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {book.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {book.ztf_id || 'Sans ID'} • {book.theme || 'Sans thème'}
                          </p>
                        </div>
                        {/* ✅ Badge coloré avec STATUS_COLORS */}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColorClass}`}>
                          {statusLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Récapitulatif du livre sélectionné */}
                {selectedBook && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-purple-900 dark:text-purple-100">
                          {selectedBook.title}
                        </p>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          {selectedBook.ztf_id} • {selectedBook.theme}
                        </p>
                      </div>
                      {/* ✅ Badge coloré dans le récapitulatif */}
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[selectedBook.ztf_status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[selectedBook.ztf_status] || selectedBook.ztf_status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seuil de validation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de validations requis *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.validation_threshold}
              onChange={(e) => setConfig({ ...config, validation_threshold: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Le livre sera automatiquement verrouillé lorsque ce seuil sera atteint
            </p>
          </div>

          {/* Langue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Langue de correction *
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="EN"
                  checked={config.language === 'EN'}
                  onChange={(e) => setConfig({ ...config, language: e.target.value as any })}
                  className="mr-2"
                />
                Anglais (EN)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="FR"
                  checked={config.language === 'FR'}
                  onChange={(e) => setConfig({ ...config, language: e.target.value as any })}
                  className="mr-2"
                />
                Français (FR)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="BOTH"
                  checked={config.language === 'BOTH'}
                  onChange={(e) => setConfig({ ...config, language: e.target.value as any })}
                  className="mr-2"
                />
                Les deux (EN+FR)
              </label>
            </div>
          </div>

          {/* Durée d'expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Durée d'expiration (jours)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={config.expiry_days}
              onChange={(e) => setConfig({ ...config, expiry_days: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez vide pour pas d'expiration
            </p>
          </div>

          {/* Correcteurs invités */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correcteurs invités (emails)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="correcteur@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
            {invitedEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {invitedEmails.map(email => (
                  <span
                    key={email}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="hover:text-purple-900"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !selectedBookId}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
            >
              {loading ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}