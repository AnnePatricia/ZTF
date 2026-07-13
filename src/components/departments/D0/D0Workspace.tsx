// src/components/departments/D0/D0Workspace.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { isAudioVideo, isDocument } from '../../../utils/fileTypeUtils';

interface RawFile {
  id: string;
  file_type: string;
  mime_type: string;
  file_url: string;
}

interface Book {
  id: string;
  ztf_id: string;
  title: string;
  current_department: string;
  ztf_status: string;
  raw_file?: RawFile | null;
}



interface D0WorkspaceProps {
  readOnly?: boolean;
}

export default function D0Workspace({ readOnly = false }: D0WorkspaceProps) {
  // export default function D0Workspace() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ztf_books')
      .select(`
        *,
        raw_file:raw_files(file_type, mime_type, file_url)
      `)
      .eq('current_department', 'D0')
      .eq('ztf_status', 'DRAFT');

    if (error) {
      console.error('Erreur chargement D0:', error);
    } else {
      setBooks(data || []);
    }
    setLoading(false);
  };

  const handleRouteToDepartment = async (book: Book) => {
    const fileType = book.raw_file?.file_type || 'DOCUMENT';
    const mimeType = book.raw_file?.mime_type || '';

    if (isAudioVideo(fileType, mimeType)) {
      // Router vers D1
      const { error } = await supabase
        .from('ztf_books')
        .update({
          current_department: 'D1',
          updated_at: new Date().toISOString()
        })
        .eq('id', book.id);

      if (error) {
        alert('❌ Erreur: ' + error.message);
      } else {
        alert(`📤 "${book.title}" envoyé en D1 (Audio/Vidéo)`);
        loadBooks();
      }
    } else if (isDocument(fileType, mimeType)) {
      // Router vers D2
      const { error } = await supabase
        .from('ztf_books')
        .update({
          current_department: 'D2',
          updated_at: new Date().toISOString()
        })
        .eq('id', book.id);

      if (error) {
        alert('❌ Erreur: ' + error.message);
      } else {
        alert(`📤 "${book.title}" envoyé en D2 (Document)`);
        loadBooks();
      }
    } else {
      alert('❌ Type de fichier non supporté');
    }
  };

  if (loading) return <div className="p-12 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">
          <i className="fas fa-database mr-3"></i>
          Module D0 — Base de Données
        </h1>
        <p className="text-green-100 mt-2">
          Routage automatique des fichiers vers les départements appropriés
        </p>

        {readOnly && (  // ✅ Afficher un badge si lecture seule
          <p className="text-amber-200 mt-2 text-sm">
            <i className="fas fa-eye mr-1"></i>
            Mode lecture seule
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">ID ZTF</th>
              <th className="px-4 py-3 text-left">Titre</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Destination</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {books.map(book => {
              const fileType = book.raw_file?.file_type || 'DOCUMENT';
              const mimeType = book.raw_file?.mime_type || '';
              const category = isAudioVideo(fileType, mimeType) ? 'AUDIO/VIDEO' : 'DOCUMENT';

              return (
                <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">{book.ztf_id}</td>
                  <td className="px-4 py-3">{book.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${category === 'AUDIO/VIDEO'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                      }`}>
                      {category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {category === 'AUDIO/VIDEO' ? '→ D1' : '→ D2'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRouteToDepartment(book)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      <i className="fas fa-paper-plane mr-1"></i>
                      Router
                    </button>
                  </td>
                </tr>
              );
            })}
            {books.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  Aucun livre en attente de routage
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
