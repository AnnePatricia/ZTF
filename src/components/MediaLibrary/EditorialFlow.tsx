import React, { useState } from "react";
import TreeView from "./TreeView";
import CategoryView from "./CategoryView";

interface EditorialFlowProps {
  rawFiles: any[];
  transcriptions: any[];
  bookProjects: any[];
  proofreadingV1: any[];
  proofreadingV2: any[];
  loading: boolean;
}

const EditorialFlow: React.FC<EditorialFlowProps> = ({
  rawFiles,
  transcriptions,
  bookProjects,
  proofreadingV1,
  proofreadingV2,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'category'>('tree');
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("Tous");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Onglets */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex gap-2 bg-gray-200 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('tree')}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'tree'
                  ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-sitemap"></i>
              Arborescence
            </button>
            <button
              onClick={() => setActiveTab('category')}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'category'
                  ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-folder"></i>
              Par Rubriques
            </button>
          </div>
          
          {/* Filtres */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                placeholder="🔍 Rechercher..."
              />
              <i className="fas fa-search absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
            
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
            >
              <option value="Tous">📅 Toutes dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : activeTab === 'tree' ? (
          <TreeView 
            rawFiles={rawFiles}
            transcriptions={transcriptions}
            bookProjects={bookProjects}
            proofreadingV1={proofreadingV1}
            proofreadingV2={proofreadingV2}
            searchTerm={searchTerm}
            dateFilter={dateFilter}
          />
        ) : (
          <CategoryView 
            rawFiles={rawFiles}
            transcriptions={transcriptions}
            bookProjects={bookProjects}
            proofreadingV1={proofreadingV1}
            proofreadingV2={proofreadingV2}
            searchTerm={searchTerm}
            dateFilter={dateFilter}
          />
        )}
      </div>
    </div>
  );
};

export default EditorialFlow;