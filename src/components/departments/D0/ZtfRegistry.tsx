// src/components/departments/D0/ZtfRegistry.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import type { ZtfBook, ZtfBookStatus } from '../../../types/ztf';
import { STATUS_CONFIG, DEPARTMENT_LABELS } from '../../../types/ztf';

interface ZtfRegistryProps {
  onImport?: () => void;
}

export default function ZtfRegistry({ onImport }: ZtfRegistryProps) {
  const [books, setBooks] = useState<ZtfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'deadline' | 'title' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadBooks();
  }, [sortBy, sortOrder]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ztf_books')
        .select(`
          *,
          raw_file:raw_files(file_type, file_size)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Erreur chargement registre:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.ztf_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.theme.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || book.current_department === departmentFilter;
      const matchesTheme = themeFilter === 'all' || book.theme === themeFilter;
      const matchesLanguage = languageFilter === 'all' || book.language === languageFilter;

      return matchesSearch && matchesStatus && matchesDepartment && matchesTheme && matchesLanguage;
    });
  }, [books, searchTerm, statusFilter, departmentFilter, themeFilter, languageFilter]);

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBooks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBooks, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, departmentFilter, themeFilter, languageFilter]);

  // Statistiques pour le tableau de bord
  const stats = useMemo(() => {
    const total = books.length;
    const byStatus: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const overdue = books.filter(b => b.deadline && new Date(b.deadline) < new Date() && b.status !== 'PUBLISHED').length;
    
    books.forEach(b => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      byDepartment[b.current_department] = (byDepartment[b.current_department] || 0) + 1;
    });

    return { total, byStatus, byDepartment, overdue, target: 2000, progress: (total / 2000) * 100 };
  }, [books]);

  const getStatusBadge = (status: ZtfBookStatus) => {
    const config = STATUS_CONFIG[status] || { label: status, percentage: 0, color: 'bg-gray-500' };
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-gray-500">{config.percentage}%</span>
      </div>
    );
  };

  // ✅ Fonction pour afficher le type de fichier
  const getFileTypeBadge = (book: ZtfBook) => {
    const fileType = (book as any).raw_file?.file_type;
    
    if (!fileType) {
      return <span className="text-xs text-gray-400">—</span>;
    }

    const isAudio = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma'].includes(fileType.toLowerCase());
    const isDocument = ['docx', 'doc', 'pdf', 'txt', 'rtf'].includes(fileType.toLowerCase());

    if (isAudio) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 flex items-center gap-1">
          <i className="fas fa-music"></i>
          Audio
        </span>
      );
    } else if (isDocument) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 flex items-center gap-1">
          <i className="fas fa-file-alt"></i>
          Document
        </span>
      );
    } else {
      return <span className="text-xs text-gray-400">{fileType.toUpperCase()}</span>;
    }
  };

  const handleSort = (column: 'created_at' | 'deadline' | 'title' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setThemeFilter('all');
    setLanguageFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || themeFilter !== 'all' || languageFilter !== 'all';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du registre...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec stats */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-database"></i>
              Registre Central D0
            </h1>
            <p className="text-purple-100 mt-2">
              Base de données transversale — {stats.total} / {stats.target} titres
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-purple-100">Total livres</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-300">{stats.overdue}</p>
              <p className="text-xs text-purple-100">En retard</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold">{stats.progress.toFixed(1)}%</p>
              <p className="text-xs text-purple-100">Objectif 2000</p>
            </div>
            <button
              onClick={onImport}
              className="bg-white text-purple-600 hover:bg-purple-50 rounded-lg px-4 py-3 font-semibold flex items-center gap-2 transition-all"
            >
              <i className="fas fa-upload"></i>
              Importer
            </button>
            <button
              onClick={loadBooks}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center gap-2 transition-all"
              title="Actualiser"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        {/* Barre de progression vers 2000 */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progression vers 2 000 titres</span>
            <span className="font-bold">{stats.total} / 2000</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div 
              className="h-3 rounded-full bg-white transition-all duration-500"
              style={{ width: `${Math.min(100, stats.progress)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Rechercher par ID, titre, thème..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label} ({stats.byStatus[key] || 0})</option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Tous les départements</option>
            {Object.entries(DEPARTMENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{key} - {label} ({stats.byDepartment[key] || 0})</option>
            ))}
          </select>

          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Tous les thèmes</option>
            {[...new Set(books.map(b => b.theme))].map(theme => (
              <option key={theme} value={theme}>{theme}</option>
            ))}
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Toutes langues</option>
            <option value="EN">Anglais (EN)</option>
            <option value="FR">Français (FR)</option>
            <option value="EN+FR">Bilingue (EN+FR)</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1"
            >
              <i className="fas fa-times-circle"></i>
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Tableau du registre */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID ZTF</th>
                <th 
                  onClick={() => handleSort('title')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div className="flex items-center gap-1">
                    Titre
                    {sortBy === 'title' && (
                      <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} text-purple-600`}></i>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thème</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Langue</th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div className="flex items-center gap-1">
                    Statut
                    {sortBy === 'status' && (
                      <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} text-purple-600`}></i>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Département</th>
                <th 
                  onClick={() => handleSort('deadline')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div className="flex items-center gap-1">
                    Deadline
                    {sortBy === 'deadline' && (
                      <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} text-purple-600`}></i>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {paginatedBooks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <i className="fas fa-inbox text-5xl mb-4 block"></i>
                    Aucun livre trouvé
                  </td>
                </tr>
              ) : (
                paginatedBooks.map(book => (
                  <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                        {book.ztf_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                        {book.title}
                      </div>
                    </td>
                    {/* ✅ Colonne Type de fichier */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getFileTypeBadge(book)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{book.theme}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                        {book.language}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(book.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {book.current_department} - {DEPARTMENT_LABELS[book.current_department]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {book.deadline ? (
                        <div className={`text-sm ${new Date(book.deadline) < new Date() && book.status !== 'PUBLISHED' ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                          {new Date(book.deadline).toLocaleDateString('fr-FR')}
                          {new Date(book.deadline) < new Date() && book.status !== 'PUBLISHED' && (
                            <span className="ml-1 text-xs">⚠️</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong className="text-purple-600">{filteredBooks.length}</strong> livre{filteredBooks.length > 1 ? 's' : ''} sur {books.length} au total
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page <strong className="text-purple-600">{currentPage}</strong> / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}