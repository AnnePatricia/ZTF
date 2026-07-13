import React, { useState, useMemo } from "react";

interface TreeViewProps {
  rawFiles: any[];
  transcriptions: any[];
  bookProjects: any[];
  proofreadingV1: any[];
  proofreadingV2: any[];
  searchTerm: string;
  dateFilter: string;
}

const TreeView: React.FC<TreeViewProps> = ({
  rawFiles,
  transcriptions,
  bookProjects,
  proofreadingV1,
  proofreadingV2,
  searchTerm,
  dateFilter,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['raw-files', 'transcriptions']);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev =>
      prev.includes(nodeId)
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  // 🔑 FILTRAGE
  const filterBySearchAndDate = (items: any[], nameField: string, dateField: string) => {
    return items.filter((item) => {
      const matchesSearch = item[nameField]?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
      
      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = new Date(item[dateField]).toDateString() === new Date().toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = new Date(item[dateField]) >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = new Date(item[dateField]) >= monthAgo;
      }
      
      return matchesSearch && matchesDate;
    });
  };

  const filteredRawFiles = filterBySearchAndDate(rawFiles, 'file_name', 'imported_at');
  const filteredTranscriptions = filterBySearchAndDate(transcriptions, 'title', 'created_at');
  const filteredBookProjects = filterBySearchAndDate(bookProjects, 'title', 'created_at');
  const filteredProofreadingV1 = filterBySearchAndDate(proofreadingV1, 'id', 'created_at');
  const filteredProofreadingV2 = filterBySearchAndDate(proofreadingV2, 'id', 'created_at');

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <i className="fas fa-sitemap mr-2 text-purple-600"></i>
          Arborescence du Flux Éditorial
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredRawFiles.length + filteredTranscriptions.length + filteredBookProjects.length + filteredProofreadingV1.length + filteredProofreadingV2.length} éléments
        </span>
      </h2>
      
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
        {/* Fichiers bruts */}
        <div className="mb-2">
          <button
            onClick={() => toggleNode('raw-files')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <i className="fas fa-folder text-yellow-500 text-lg"></i>
              <span className="font-medium text-gray-900 dark:text-white">Fichiers bruts</span>
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                {filteredRawFiles.length}
              </span>
            </div>
            <i className={`fas fa-chevron-${expandedNodes.includes('raw-files') ? 'down' : 'right'} text-gray-400`}></i>
          </button>
          
          {expandedNodes.includes('raw-files') && (
            <div className="ml-8 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
              {filteredRawFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer">
                  <i className={`fas ${file.file_type === 'audio' ? 'fa-music text-blue-500' : file.file_type === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-file-image text-green-500'} text-sm`}></i>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{file.file_name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {new Date(file.imported_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transcriptions */}
        <div className="mb-2">
          <button
            onClick={() => toggleNode('transcriptions')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <i className="fas fa-file-alt text-green-500 text-lg"></i>
              <span className="font-medium text-gray-900 dark:text-white">Transcriptions</span>
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                {filteredTranscriptions.length}
              </span>
            </div>
            <i className={`fas fa-chevron-${expandedNodes.includes('transcriptions') ? 'down' : 'right'} text-gray-400`}></i>
          </button>
          
          {expandedNodes.includes('transcriptions') && (
            <div className="ml-8 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
              {filteredTranscriptions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer">
                  <i className="fas fa-file-lines text-green-500 text-sm"></i>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t.title}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {new Date(t.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projets de livre */}
        <div className="mb-2">
          <button
            onClick={() => toggleNode('book-projects')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <i className="fas fa-book text-purple-500 text-lg"></i>
              <span className="font-medium text-gray-900 dark:text-white">Projets de livre</span>
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                {filteredBookProjects.length}
              </span>
            </div>
            <i className={`fas fa-chevron-${expandedNodes.includes('book-projects') ? 'down' : 'right'} text-gray-400`}></i>
          </button>
          
          {expandedNodes.includes('book-projects') && (
            <div className="ml-8 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
              {filteredBookProjects.map((bp) => (
                <div key={bp.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer">
                  <i className="fas fa-book text-purple-500 text-sm"></i>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{bp.title}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {new Date(bp.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relecture 1 */}
        <div className="mb-2">
          <button
            onClick={() => toggleNode('proofreading-v1')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <i className="fas fa-eye text-amber-500 text-lg"></i>
              <span className="font-medium text-gray-900 dark:text-white">Relecture 1</span>
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                {filteredProofreadingV1.length}
              </span>
            </div>
            <i className={`fas fa-chevron-${expandedNodes.includes('proofreading-v1') ? 'down' : 'right'} text-gray-400`}></i>
          </button>
          
          {expandedNodes.includes('proofreading-v1') && (
            <div className="ml-8 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
              {filteredProofreadingV1.map((pr1) => (
                <div key={pr1.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer">
                  <i className="fas fa-eye text-amber-500 text-sm"></i>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Relecture 1 - {pr1.book_project_title || 'Projet inconnu'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {new Date(pr1.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relecture 2 */}
        <div className="mb-2">
          <button
            onClick={() => toggleNode('proofreading-v2')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <i className="fas fa-eye-double text-red-500 text-lg"></i>
              <span className="font-medium text-gray-900 dark:text-white">Relecture 2</span>
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                {filteredProofreadingV2.length}
              </span>
            </div>
            <i className={`fas fa-chevron-${expandedNodes.includes('proofreading-v2') ? 'down' : 'right'} text-gray-400`}></i>
          </button>
          
          {expandedNodes.includes('proofreading-v2') && (
            <div className="ml-8 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
              {filteredProofreadingV2.map((pr2) => (
                <div key={pr2.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer">
                  <i className="fas fa-eye-double text-red-500 text-sm"></i>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Relecture 2 - {pr2.book_project_title || pr2.proofreading_v1_title || 'R1 inconnue'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {new Date(pr2.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TreeView;