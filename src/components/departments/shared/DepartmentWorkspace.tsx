// src/components/departments/shared/DepartmentWorkspace.tsx
import { useState } from 'react';
import { useDepartmentBooks } from '../../../hooks/useDepartmentBooks';
import { DEPARTMENTS, type DepartmentConfig } from '../../../config/departments';
import type { ZtfDepartment, ZtfBook } from '../../../types/ztf';

interface DepartmentWorkspaceProps {
  department: ZtfDepartment;
}

export default function DepartmentWorkspace({ department }: DepartmentWorkspaceProps) {
  const config = DEPARTMENTS[department];
  const {
    books,
    stats,
    loading,
    error,
    acceptBook,
    returnBook,
    rejectBook,
    startWork,
    submitForReview
  } = useDepartmentBooks(department);

  const [_selectedBook, setSelectedBook] = useState<ZtfBook | null>(null);
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'accept' | 'return' | 'reject' | null;
    book: ZtfBook | null;
  }>({ open: false, type: null, book: null });
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleAction = async (type: 'accept' | 'return' | 'reject') => {
    if (!actionModal.book) return;
    setProcessing(true);

    let result;
    if (type === 'accept') {
      result = await acceptBook(actionModal.book.id, notes);
    } else if (type === 'return') {
      result = await returnBook(actionModal.book.id, notes);
    } else {
      result = await rejectBook(actionModal.book.id, notes);
    }

    setProcessing(false);
    if (result.success) {
      setActionModal({ open: false, type: null, book: null });
      setNotes('');
    } else {
      alert(`❌ Erreur: ${result.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête du département */}
      <div className={`bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} rounded-xl shadow-lg p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <i className={`fas ${config.icon} text-3xl`}></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{config.name}</h1>
              <p className="text-white/80 mt-1">{config.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/70">Flux suivant</p>
            <p className="text-xl font-bold">
              {config.nextDepartment === 'PUBLISHED' ? '🎉 Publication' :
               config.nextDepartment ? DEPARTMENTS[config.nextDepartment].shortName : '—'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <StatCard label="Total" value={stats.total} icon="fa-layer-group" />
          <StatCard label="En attente" value={stats.pending} icon="fa-clock" color="yellow" />
          <StatCard label="En cours" value={stats.inProgress} icon="fa-spinner" color="blue" />
          <StatCard label="Terminés" value={stats.completed} icon="fa-check" color="green" />
          <StatCard label="Retournés" value={stats.returned} icon="fa-undo" color="red" />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {error}
        </div>
      )}

      {/* Liste des livres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className={`fas ${config.icon} ${config.textDark}`}></i>
            Livres dans {config.shortName}
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Chargement...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fas fa-inbox text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <p className="text-gray-500 dark:text-gray-400">Aucun livre dans ce département</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {books.map(book => (
              <BookRow
                key={book.id}
                book={book}
                config={config}
                onStartWork={() => startWork(book.id)}
                onSubmit={() => submitForReview(book.id)}
                onAccept={() => setActionModal({ open: true, type: 'accept', book })}
                onReturn={() => setActionModal({ open: true, type: 'return', book })}
                onReject={() => setActionModal({ open: true, type: 'reject', book })}
                onSelect={() => setSelectedBook(book)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal d'action */}
      {actionModal.open && actionModal.book && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {actionModal.type === 'accept' && '✅ Accepter et transmettre'}
                {actionModal.type === 'return' && '↩️ Retourner au département précédent'}
                {actionModal.type === 'reject' && '❌ Rejeter le livre'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {actionModal.book.ztf_id} — {actionModal.book.title}
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes / Commentaire
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Ajoutez un commentaire (optionnel)..."
              />

              {actionModal.type === 'accept' && config.nextDepartment && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    📤 Le livre sera transmis à : <strong>
                      {config.nextDepartment === 'PUBLISHED' ? 'Publication' : DEPARTMENTS[config.nextDepartment].name}
                    </strong>
                  </p>
                </div>
              )}

              {actionModal.type === 'return' && config.previousDepartment && (
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    ↩️ Le livre sera retourné à : <strong>{DEPARTMENTS[config.previousDepartment].name}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setActionModal({ open: false, type: null, book: null });
                  setNotes('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={processing}
              >
                Annuler
              </button>
              <button
                onClick={() => handleAction(actionModal.type!)}
                disabled={processing}
                className={`px-6 py-2 rounded-lg text-white font-medium ${
                  actionModal.type === 'accept' ? 'bg-green-600 hover:bg-green-700' :
                  actionModal.type === 'return' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {processing ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant carte livre
function BookRow({
  book,
  config,
  onStartWork,
  onSubmit,
  onAccept,
  onReturn,
  onReject,
  onSelect
}: {
  book: ZtfBook;
  config: DepartmentConfig;
  onStartWork: () => void;
  onSubmit: () => void;
  onAccept: () => void;
  onReturn: () => void;
  onReject: () => void;
  onSelect: () => void;
}) {
  const statusColors: Record<string, string> = {
    'DRAFT': 'bg-gray-100 text-gray-800',
    'PENDING_REVIEW': 'bg-yellow-100 text-yellow-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'IN_REVIEW': 'bg-purple-100 text-purple-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'RETURNED': 'bg-orange-100 text-orange-800',
    'REJECTED': 'bg-red-100 text-red-800',
    'PUBLISHED': 'bg-emerald-100 text-emerald-800'
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <div className={`w-12 h-12 rounded-lg ${config.bgLight} ${config.bgDark} flex items-center justify-center flex-shrink-0`}>
            <i className={`fas ${config.icon} ${config.textDark}`}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{book.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {book.ztf_id} • {book.theme} • {book.language}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Responsable: {book.responsible_name || 'Non assigné'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[book.ztf_status] || 'bg-gray-100'}`}>
            {book.ztf_status.replace(/_/g, ' ')}
          </span>

          {book.target_date && (
            <span className="text-xs text-gray-500">
              📅 {new Date(book.target_date).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 ml-16">
        {book.ztf_status === 'PENDING_REVIEW' && (
          <>
            <button
              onClick={onStartWork}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-play"></i> Commencer
            </button>
            <button
              onClick={onAccept}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-check"></i> Accepter
            </button>
            <button
              onClick={onReturn}
              className="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-undo"></i> Retourner
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-times"></i> Rejeter
            </button>
          </>
        )}

        {book.ztf_status === 'IN_PROGRESS' && (
          <button
            onClick={onSubmit}
            className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1"
          >
            <i className="fas fa-paper-plane"></i> Soumettre pour validation
          </button>
        )}

        {/* ✅ BOUTONS POUR IN_REVIEW */}
        {book.ztf_status === 'IN_REVIEW' && (
          <>
            <button
              onClick={onAccept}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-check"></i> Accepter
            </button>
            <button
              onClick={onReturn}
              className="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-undo"></i> Retourner
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-times"></i> Rejeter
            </button>
          </>
        )}

        {book.ztf_status === 'DRAFT' && (
          <button
            onClick={onStartWork}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
          >
            <i className="fas fa-play"></i> Commencer le travail
          </button>
        )}

        {/* ✅ AJOUTER CE BLOC POUR RETURNED */}
        {book.ztf_status === 'RETURNED' && (
          <>
            <button
              onClick={onStartWork}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-redo"></i> Reprendre le travail
            </button>
            <button
              onClick={onSubmit}
              className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1"
            >
              <i className="fas fa-paper-plane"></i> Soumettre pour validation
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Carte de stats
function StatCard({ label, value, icon, color = 'white' }: {
  label: string;
  value: number;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
      <i className={`fas ${icon} text-${color}-300 mb-1`}></i>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  );
}