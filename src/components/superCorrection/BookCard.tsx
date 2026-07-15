// src/components/superCorrection/BookCard.tsx
import { SC_STATUS_CONFIG } from '../../types/superCorrection';
import type { SuperCorrectionBook } from '../../types/superCorrection';

interface BookCardProps {
  book: SuperCorrectionBook;
  onClick: () => void;
}

export default function BookCard({ book, onClick }: BookCardProps) {
  const statusConfig = SC_STATUS_CONFIG[book.status];
  const progressPercent = Math.round((book.validation_count / book.validation_threshold) * 100);

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-400"
    >
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
            {book.book_title || 'Livre sans titre'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {book.book_ztf_id || 'N/A'}
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium text-white rounded-full ${statusConfig.color}`}>
          <i className={`fas ${statusConfig.icon} mr-1`}></i>
          {statusConfig.label}
        </span>
      </div>

      {/* Progression des validations */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Validations
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {book.validation_count} / {book.validation_threshold}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
          <div
            className={`rounded-full h-3 transition-all ${
              progressPercent >= 100 ? 'bg-green-500' : 'bg-purple-500'
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{progressPercent}% atteint</p>
      </div>

      {/* Informations complémentaires */}
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <i className="fas fa-language"></i>
          <span>{book.language === 'BOTH' ? 'EN + FR' : book.language}</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fas fa-calendar"></i>
          <span>Publié le {new Date(book.published_at).toLocaleDateString('fr-FR')}</span>
        </div>
        {book.expiry_date && (
          <div className="flex items-center gap-2">
            <i className="fas fa-clock"></i>
            <span>Expire le {new Date(book.expiry_date).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
        {book.locked_at && (
          <div className="flex items-center gap-2 text-green-600">
            <i className="fas fa-lock"></i>
            <span>Verrouillé le {new Date(book.locked_at).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
      </div>

      {/* Correcteurs invités */}
      {book.invited_correctors && book.invited_correctors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 mb-2">
            {book.invited_correctors.length} correcteur{book.invited_correctors.length > 1 ? 's' : ''} invité{book.invited_correctors.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}