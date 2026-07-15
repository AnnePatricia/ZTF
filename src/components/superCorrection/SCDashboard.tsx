// src/components/superCorrection/SCDashboard.tsx
import { useState } from 'react';
import { useSuperCorrection } from '../../hooks/useSuperCorrection';
import { type SuperCorrectionBook } from '../../types/superCorrection';
import PublishBookModal from './PublishBookModal';
import BookCard from './BookCard';
import BookDetailModal from './BookDetailModal';

export default function SCDashboard() {
  const { books, loading, error, refresh } = useSuperCorrection();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<SuperCorrectionBook | null>(null);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement de Super Correction...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <p className="text-red-700 dark:text-red-300">❌ Erreur: {error}</p>
      </div>
    );
  }

  const activeBooks = books.filter(b => b.status === 'SUPER_CORRECTION_OPEN');
  const lockedBooks = books.filter(b => b.status === 'SUPER_CORRECTION_LOCKED');
  const closedBooks = books.filter(b => b.status === 'SUPER_CORRECTION_CLOSED');

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-users-cog"></i>
              Super Correction
            </h1>
            <p className="text-purple-100 mt-2">
              Plateforme de validation communautaire mondiale
            </p>
          </div>
          <button
            onClick={() => setShowPublishModal(true)}
            className="px-6 py-3 bg-white text-purple-600 hover:bg-purple-50 rounded-lg font-semibold flex items-center gap-2 shadow-lg"
          >
            <i className="fas fa-plus"></i>
            Publier un livre
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <i className="fas fa-lock-open text-3xl text-blue-600"></i>
            <div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{activeBooks.length}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">En correction</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <i className="fas fa-lock text-3xl text-green-600"></i>
            <div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{lockedBooks.length}</p>
              <p className="text-sm text-green-700 dark:text-green-300">Verrouillés</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <i className="fas fa-times-circle text-3xl text-gray-600"></i>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{closedBooks.length}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">Fermés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Livres en cours */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-book text-purple-600"></i>
          Livres en Super Correction
        </h2>
        {books.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-inbox text-5xl mb-4 block opacity-50"></i>
            <p>Aucun livre publié en Super Correction</p>
            <button
              onClick={() => setShowPublishModal(true)}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Publier votre premier livre
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => setSelectedBook(book)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showPublishModal && (
        <PublishBookModal
          onClose={() => setShowPublishModal(false)}
          onSuccess={() => {
            setShowPublishModal(false);
            refresh();
          }}
        />
      )}

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}