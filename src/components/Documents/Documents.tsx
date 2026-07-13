// src/components/Documents/Documents.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import type { ZtfDepartment } from '../../types/ztf';
import { useRoles } from '../../hooks/useRoles';

// ✅ Imports des workspaces
import D0Workspace from '../departments/D0/D0Workspace';
import D1Workspace from '../departments/D1/D1Workspace';
import D2Workspace from '../departments/D2/D2Workspace';
import D3Workspace from '../departments/D3/D3Workspace';
import D4Workspace from '../departments/D4/D4Workspace';
import D5Workspace from '../departments/D5/D5Workspace';
import D6Workspace from '../departments/D6/D6Workspace';
import D7Workspace from '../departments/D7/D7Workspace';
import D8Workspace from '../departments/D8/D8Workspace';
import ImportD0Modal from '../departments/D0/ImportD0Modal';

interface ZtfBook {
  id: string;
  ztf_id: string;
  title: string;
  theme: string;
  language: string;
  ztf_status: string;
  current_department: string;
  responsible_name: string;
  deadline: string;
  created_at: string;
  updated_at: string;
}

interface DocumentsProps {
  userDepartment: string | null;
  userIsAdmin: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; percentage: number; color: string }> = {
  'DRAFT': { label: 'Brouillon', percentage: 0, color: 'bg-gray-500' },
  'TRANSCRIBED': { label: 'Transcrit', percentage: 15, color: 'bg-blue-500' },
  'CLEANED': { label: 'Nettoyé', percentage: 30, color: 'bg-cyan-500' },
  'STRUCTURED': { label: 'Structuré', percentage: 50, color: 'bg-indigo-500' },
  'REWRITTEN': { label: 'Réécrit', percentage: 65, color: 'bg-pink-500' },
  'CORRECTED': { label: 'Corrigé', percentage: 75, color: 'bg-emerald-500' },
  'TRANSLATED': { label: 'Traduit', percentage: 88, color: 'bg-amber-500' },
  'BAT_PENDING': { label: 'BAT en attente', percentage: 95, color: 'bg-orange-500' },
  'BAT_APPROVED': { label: 'BAT approuvé', percentage: 98, color: 'bg-green-500' },
  'PUBLISHED': { label: 'Publié', percentage: 100, color: 'bg-green-600' },
};

const DEPARTMENTS: Record<string, string> = {
  'D0': 'Base de Données',
  'D1': 'Ingestion & Archivage',
  'D2': 'Transcription Validée',
  'D3': 'Nettoyage Éditorial',
  'D4': 'Éditorialisation',
  'D5': 'Réécriture & Style ZTF',
  'D6': 'Correction Intelligente',
  'D7': 'Traduction',
  'D8': 'Pré-BAT & BAT',
};

const DEPARTMENT_ICONS: Record<string, string> = {
  'D0': 'fa-database',
  'D1': 'fa-archive',
  'D2': 'fa-file-alt',
  'D3': 'fa-broom',
  'D4': 'fa-book',
  'D5': 'fa-pen-fancy',
  'D6': 'fa-spell-check',
  'D7': 'fa-language',
  'D8': 'fa-file-pdf',
};

export default function Documents({ userDepartment, userIsAdmin }: DocumentsProps) {
  const { currentUser, isChef, isAdmin } = useRoles();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [books, setBooks] = useState<ZtfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeDepartment, setActiveDepartment] = useState<ZtfDepartment | null>(null);
  const [currentView, setCurrentView] = useState<'flow' | 'library'>('flow');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('ztf_books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Erreur chargement livres:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    return books
      .filter(book => {
        const matchesSearch =
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.ztf_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.theme.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || book.ztf_status === statusFilter;
        const matchesDepartment = departmentFilter === 'all' || book.current_department === departmentFilter;
        const matchesLanguage = languageFilter === 'all' || book.language === languageFilter;

        return matchesSearch && matchesStatus && matchesDepartment && matchesLanguage;
      })
      .sort((a, b) => {
        const aValue = a[sortBy as keyof ZtfBook];
        const bValue = b[sortBy as keyof ZtfBook];
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [books, searchTerm, statusFilter, departmentFilter, languageFilter, sortBy, sortOrder]);

  const getStatusBadge = (status: string) => {
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

  const getProgressBar = (status: string) => {
    const percentage = STATUS_CONFIG[status]?.percentage || 0;
    const color = STATUS_CONFIG[status]?.color || 'bg-gray-500';
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Progression</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  const renderDepartmentWorkspace = () => {
    if (!activeDepartment) return null;

    switch (activeDepartment) {
      case 'D0': return <D0Workspace />;
      case 'D1': return <D1Workspace />;
      case 'D2': return <D2Workspace currentUser={currentUser} isChef={isChef()} isAdmin={isAdmin()} />;
      case 'D3': return <D3Workspace />;
      case 'D4': return <D4Workspace />;
      case 'D5': return <D5Workspace />;
      case 'D6': return <D6Workspace />;
      case 'D7': return <D7Workspace />;
      case 'D8': return <D8Workspace />;
      default: return null;
    }
  };

  if (activeDepartment) {
    const canAccess = userIsAdmin || userDepartment === activeDepartment;

    if (!canAccess) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center mt-6">
          <div className="text-red-500 mb-4">
            <i className="fas fa-lock text-6xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ACCÈS NON AUTORISÉ
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Vous n'avez pas les permissions nécessaires pour accéder au module <strong>{activeDepartment}</strong>.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setActiveDepartment(null)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveDepartment(null)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i> Retour aux Documents
        </button>
        {renderDepartmentWorkspace()}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement de la bibliothèque...</p>
      </div>
    );
  }

  const visibleDepartments = userIsAdmin
    ? Object.keys(DEPARTMENTS)
    : userDepartment
      ? [userDepartment]
      : [];

  return (
    <div className="space-y-6">
      {/* Header Pipeline Éditorial */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-folder-open"></i>
              ZTF-GEST — Pipeline Éditorial
            </h1>
            <p className="text-purple-100 mt-2">
              Production des 2 000 titres du Professeur Z.T. Fomum
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">1</div>
              <div className="text-xs text-purple-200">Fichiers bruts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-xs text-purple-200">Transcriptions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-xs text-purple-200">Projets</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-xs text-purple-200">Relectures</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Flux éditorial / Médiathèque */}
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentView('flow')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
            currentView === 'flow'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <i className="fas fa-sitemap mr-2"></i>
          Flux éditorial
        </button>
        {userIsAdmin && (
          <button
            onClick={() => setCurrentView('library')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
              currentView === 'library'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <i className="fas fa-th mr-2"></i>
            Médiathèque
          </button>
        )}
      </div>

      {currentView === 'flow' ? (
        <>
          {/* Boutons départements D0-D8 */}
          <div className="flex gap-2 flex-wrap">
            {visibleDepartments.map((dept) => (
              <button
                key={dept}
                onClick={() => setActiveDepartment(dept as ZtfDepartment)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeDepartment === dept
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <i className={`fas ${DEPARTMENT_ICONS[dept] || 'fa-folder'}`}></i>
                {dept}
              </button>
            ))}
          </div>

          {/* Registre Central D0 */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <i className="fas fa-database"></i>
                  Base de Données D0
                </h2>
                <p className="text-purple-100 mt-1">
                  Colonne vertébrale transversale — {filteredBooks.length} / 2000 titres
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl font-bold">{filteredBooks.length}</div>
                  <div className="text-xs text-purple-100">Total livres</div>
                </div>
                <div className="text-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl font-bold text-red-300">0</div>
                  <div className="text-xs text-purple-100">En retard</div>
                </div>
                <div className="text-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl font-bold">0.1%</div>
                  <div className="text-xs text-purple-100">Objectif 2000</div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 flex items-center gap-2"
                >
                  <i className="fas fa-upload"></i>
                  Importer
                </button>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-100">Progression vers 2 000 titres</span>
                <span className="font-semibold">{filteredBooks.length} / 2000</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-white h-3 rounded-full transition-all"
                  style={{ width: `${(filteredBooks.length / 2000) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Rechercher par ID, titre, thème..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
                <option value="all">Tous les départements</option>
                {Object.entries(DEPARTMENTS).map(([key, label]) => (
                  <option key={key} value={key}>{key} - {label}</option>
                ))}
              </select>
              <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
                <option value="all">Toutes langues</option>
                <option value="EN">Anglais (EN)</option>
                <option value="FR">Français (FR)</option>
                <option value="EN+FR">Bilingue (EN+FR)</option>
              </select>
            </div>
          </div>

          {/* Tableau des livres */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      <button
                        onClick={() => {
                          setSortBy('ztf_id');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-2 hover:text-gray-700"
                      >
                        ID ZTF
                        <i className={`fas fa-sort ${sortBy === 'ztf_id' ? 'text-purple-600' : ''}`}></i>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Titre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Thème</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Langue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Département</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-inbox text-5xl mb-4 block"></i>
                        Aucun document trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredBooks.map(book => (
                      <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                            {book.ztf_id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{book.title}</div>
                          <div className="mt-2">{getProgressBar(book.ztf_status)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">—</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{book.theme}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                            {book.language}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(book.ztf_status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {book.current_department} - {DEPARTMENTS[book.current_department] || 'Inconnu'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">—</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-purple-600">{filteredBooks.length}</strong> livres sur <strong>{books.length}</strong> au total
            </div>
          </div>
        </>
      ) : (
        /* Vue Médiathèque */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
          <div className="text-purple-600 mb-4">
            <i className="fas fa-photo-video text-6xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Médiathèque
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            La gestion des fichiers médias sera disponible ici.
          </p>
          <button
            onClick={() => setCurrentView('flow')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Retour au Flux éditorial
          </button>
        </div>
      )}

      {isImportModalOpen && (
        <ImportD0Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            loadBooks();
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}