// src/components/departments/D7/ArchiveViewer.tsx
import type { FinalArchive } from '../../../types/proofreadingV2';

interface ArchiveViewerProps {
  archives: FinalArchive[];
  onBack: () => void;
}

export default function ArchiveViewer({ archives, onBack }: ArchiveViewerProps) {
  return (
    <div className="space-y-6">
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
                <i className="fas fa-archive text-indigo-600"></i>
                Archives finales
              </h2>
              <p className="text-sm text-gray-500">
                {archives.length} document(s) archivé(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des archives */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Archive</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID ZTF</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archivé par</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rétention</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {archives.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <i className="fas fa-archive text-5xl mb-4 block opacity-50"></i>
                    Aucune archive
                  </td>
                </tr>
              ) : (
                archives.map(archive => (
                  <tr key={archive.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-mono bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded font-bold">
                        {archive.archive_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {archive.book?.ztf_id || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                        {archive.book?.title || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(archive.archive_date).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {archive.archived_user?.full_name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {archive.retention_years} ans
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {archive.final_pdf_url && (
                        <a
                          href={archive.final_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm flex items-center gap-1"
                        >
                          <i className="fas fa-file-pdf"></i>
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}