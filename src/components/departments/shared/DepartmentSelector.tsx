// src/components/departments/shared/DepartmentSelector.tsx
import { DEPARTMENTS, DEPARTMENT_ORDER } from '../../../config/departments';
import type { ZtfDepartment } from '../../../types/ztf';

interface DepartmentSelectorProps {
  activeDepartment: ZtfDepartment;
  onSelect: (dept: ZtfDepartment) => void;
}

// ✅ Mapping des couleurs pour les boutons actifs
const ACTIVE_COLORS: Record<string, string> = {
  purple: 'bg-purple-600 text-white shadow-lg',
  blue: 'bg-blue-600 text-white shadow-lg',
  cyan: 'bg-cyan-600 text-white shadow-lg',
  indigo: 'bg-indigo-600 text-white shadow-lg',
  pink: 'bg-pink-600 text-white shadow-lg',
  red: 'bg-red-600 text-white shadow-lg',
  orange: 'bg-orange-600 text-white shadow-lg',
  green: 'bg-green-600 text-white shadow-lg'
};

export default function DepartmentSelector({ activeDepartment, onSelect }: DepartmentSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-2">
      <div className="flex gap-2 overflow-x-auto">
        {DEPARTMENT_ORDER.map(dept => {
          const config = DEPARTMENTS[dept];
          const isActive = activeDepartment === dept;
          return (
            <button
              key={dept}
              onClick={() => onSelect(dept)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isActive
                  ? ACTIVE_COLORS[config.color] || 'bg-gray-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <i className={`fas ${config.icon}`}></i>
              <span>{config.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}