// src/components/superCorrection/BookDetailModal.tsx
import { SC_STATUS_CONFIG } from '../../types/superCorrection';
import type { SuperCorrectionBook } from '../../types/superCorrection';

interface BookDetailModalProps {
  book: SuperCorrectionBook;
  onClose: () => void;
}

export default function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  const statusConfig = SC_STATUS_CONFIG[book.status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Détails du livre
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Titre et statut */}
          <div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {book.book_title || 'Livre sans titre'}
            </h4>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-sm font-medium text-white rounded-full ${statusConfig.color}`}>
                <i className={`fas ${statusConfig.icon} mr-2`}></i>
                {statusConfig.label}
              </span>
              <span className="text-sm text-gray-500">
                {book.book_ztf_id || 'N/A'}
              </span>
            </div>
          </div>

          {/* Statistiques de validation */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
              Progression des validations
            </h5>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {book.validation_count} sur {book.validation_threshold} validations requises
              </span>
              <span className="text-sm font-bold text-purple-600">
                {Math.round((book.validation_count / book.validation_threshold) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-purple-600 rounded-full h-3 transition-all"
                style={{ width: `${Math.min((book.validation_count / book.validation_threshold) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Informations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Langue</label>
              <p className="text-gray-900 dark:text-white">
                {book.language === 'BOTH' ? 'EN + FR' : book.language}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Publié par</label>
              <p className="text-gray-900 dark:text-white">
                {book.published_by}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date de publication</label>
              <p className="text-gray-900 dark:text-white">
                {new Date(book.published_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            {book.expiry_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Date d'expiration</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(book.expiry_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
            {book.locked_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Verrouillé le</label>
                <p className="text-green-600">
                  {new Date(book.locked_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
          </div>

          {/* Correcteurs invités */}
          {book.invited_correctors && book.invited_correctors.length > 0 && (
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                Correcteurs invités ({book.invited_correctors.length})
              </h5>
              <div className="space-y-2">
                {book.invited_correctors.map((corrector) => (
                  <div
                    key={corrector.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {corrector.full_name || corrector.email}
                      </p>
                      <p className="text-sm text-gray-500">{corrector.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {corrector.validation_count || 0} validation{corrector.validation_count && corrector.validation_count > 1 ? 's' : ''}
                      </span>
                      {corrector.accepted_at ? (
                        <span className="ml-2 text-xs text-green-600">Accepté</span>
                      ) : corrector.expired_at ? (
                        <span className="ml-2 text-xs text-red-600">Expiré</span>
                      ) : (
                        <span className="ml-2 text-xs text-amber-600">En attente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}