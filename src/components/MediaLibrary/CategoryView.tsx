import React, { useMemo } from "react";

interface CategoryViewProps {
  rawFiles: any[];
  transcriptions: any[];
  bookProjects: any[];
  proofreadingV1: any[];
  proofreadingV2: any[];
  searchTerm: string;
  dateFilter: string;
}

const CategoryView: React.FC<CategoryViewProps> = ({
  rawFiles,
  transcriptions,
  bookProjects,
  proofreadingV1,
  proofreadingV2,
  searchTerm,
  dateFilter,
}) => {
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

  const categories = [
    {
      id: 'imported',
      title: 'Fichiers Importés',
      icon: 'fa-download text-blue-500',
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      items: filterBySearchAndDate(rawFiles, 'file_name', 'imported_at'),
      nameField: 'file_name',
      dateField: 'imported_at',
    },
    {
      id: 'transcribed',
      title: 'Transcrits',
      icon: 'fa-file-lines text-green-500',
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      items: filterBySearchAndDate(transcriptions, 'title', 'created_at'),
      nameField: 'title',
      dateField: 'created_at',
    },
    {
      id: 'book-projects',
      title: 'Projets de Livre',
      icon: 'fa-book text-purple-500',
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      items: filterBySearchAndDate(bookProjects, 'title', 'created_at'),
      nameField: 'title',
      dateField: 'created_at',
    },
    {
      id: 'proofreading',
      title: 'Relectures',
      icon: 'fa-eye text-amber-500',
      color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      items: [...filterBySearchAndDate(proofreadingV1, 'id', 'created_at'), ...filterBySearchAndDate(proofreadingV2, 'id', 'created_at')],
      nameField: 'id',
      dateField: 'created_at',
    },
  ];

  const totalItems = categories.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center justify-between">
        <div className="flex items-center">
          <i className="fas fa-folder mr-2 text-purple-600"></i>
          Vue par Rubriques
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalItems} élément{totalItems > 1 ? 's' : ''}
        </span>
      </h2>
      
      {totalItems === 0 ? (
        <div className="text-center py-16">
          <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400">Aucun résultat ne correspond aux filtres</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`rounded-lg border p-4 ${category.color}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <i className={`fas ${category.icon} text-2xl`}></i>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.items.length} fichier{category.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:shadow transition-all">
                  Voir tout
                </button>
              </div>
              
              <div className="space-y-2">
                {category.items.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {item[category.nameField] || 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item[category.dateField]).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
                {category.items.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    + {category.items.length - 5} autres...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryView;