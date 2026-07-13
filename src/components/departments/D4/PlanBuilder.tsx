// src/components/departments/D4/PlanBuilder.tsx
import { useState } from 'react';
import type { PlanItem } from '../../../types/editorialization';

interface PlanBuilderProps {
  plan: PlanItem[];
  onPlanChange: (plan: PlanItem[]) => void;
}

export default function PlanBuilder({ plan, onPlanChange }: PlanBuilderProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const generateId = () => `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addPart = () => {
    const newPart: PlanItem = {
      id: generateId(),
      type: 'part',
      number: plan.filter(p => p.type === 'part').length + 1,
      title: `Partie ${plan.filter(p => p.type === 'part').length + 1}`,
      children: [],
    };
    onPlanChange([...plan, newPart]);
  };

  const addChapter = (parentId?: string) => {
    const newChapter: PlanItem = {
      id: generateId(),
      type: 'chapter',
      number: plan.reduce((acc, p) => acc + (p.type === 'chapter' ? 1 : (p.children?.length || 0)), 0) + 1,
      title: `Chapitre ${plan.reduce((acc, p) => acc + (p.type === 'chapter' ? 1 : (p.children?.length || 0)), 0) + 1}`,
      parent_id: parentId,
      children: [],
    };

    if (parentId) {
      const updatedPlan = plan.map(p => {
        if (p.id === parentId) {
          return { ...p, children: [...(p.children || []), newChapter] };
        }
        return p;
      });
      onPlanChange(updatedPlan);
    } else {
      onPlanChange([...plan, newChapter]);
    }
  };

  const addSection = (parentId: string) => {
    const parent = plan.find(p => p.id === parentId);
    if (!parent) return;

    const newSection: PlanItem = {
      id: generateId(),
      type: 'section',
      number: (parent.children?.length || 0) + 1,
      title: `Section ${(parent.children?.length || 0) + 1}`,
      parent_id: parentId,
    };

    const updatedPlan = plan.map(p => {
      if (p.id === parentId) {
        return { ...p, children: [...(p.children || []), newSection] };
      }
      return p;
    });
    onPlanChange(updatedPlan);
  };

  const startEdit = (item: PlanItem) => {
    setEditingItem(item.id);
    setEditTitle(item.title);
  };

  const saveEdit = (itemId: string) => {
    const updateItem = (items: PlanItem[]): PlanItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, title: editTitle };
        }
        if (item.children) {
          return { ...item, children: updateItem(item.children) };
        }
        return item;
      });
    };
    onPlanChange(updateItem(plan));
    setEditingItem(null);
    setEditTitle('');
  };

  const removeItem = (itemId: string) => {
    if (!confirm('Supprimer cet élément du plan ?')) return;

    const removeRecursive = (items: PlanItem[]): PlanItem[] => {
      return items
        .filter(item => item.id !== itemId)
        .map(item => ({
          ...item,
          children: item.children ? removeRecursive(item.children) : undefined,
        }));
    };
    onPlanChange(removeRecursive(plan));
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const findAndMove = (items: PlanItem[]): PlanItem[] => {
      const index = items.findIndex(item => item.id === itemId);
      if (index === -1) {
        return items.map(item => ({
          ...item,
          children: item.children ? findAndMove(item.children) : undefined,
        }));
      }

      const newItems = [...items];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return items;

      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      return newItems;
    };
    onPlanChange(findAndMove(plan));
  };

  const renderPlanItem = (item: PlanItem, depth: number = 0) => {
    const isEditing = editingItem === item.id;
    const iconClass = item.type === 'part' ? 'fa-layer-group text-purple-600' :
                      item.type === 'chapter' ? 'fa-book text-blue-600' :
                      'fa-file-alt text-gray-600';

    return (
      <div key={item.id} className="mb-2">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
            depth === 0 ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' :
            depth === 1 ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' :
            'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <i className={`fas ${iconClass}`}></i>

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => saveEdit(item.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(item.id); }}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          ) : (
            <span
              className="flex-1 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              onDoubleClick={() => startEdit(item)}
            >
              {item.title}
            </span>
          )}

          <div className="flex gap-1">
            <button
              onClick={() => moveItem(item.id, 'up')}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Monter"
            >
              <i className="fas fa-arrow-up text-xs"></i>
            </button>
            <button
              onClick={() => moveItem(item.id, 'down')}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Descendre"
            >
              <i className="fas fa-arrow-down text-xs"></i>
            </button>
            <button
              onClick={() => startEdit(item)}
              className="p-1 text-blue-500 hover:text-blue-700"
              title="Renommer"
            >
              <i className="fas fa-edit text-xs"></i>
            </button>
            {item.type !== 'section' && (
              <button
                onClick={() => item.type === 'part' ? addChapter(item.id) : addSection(item.id)}
                className="p-1 text-green-500 hover:text-green-700"
                title={item.type === 'part' ? 'Ajouter un chapitre' : 'Ajouter une section'}
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            )}
            <button
              onClick={() => removeItem(item.id)}
              className="p-1 text-red-500 hover:text-red-700"
              title="Supprimer"
            >
              <i className="fas fa-trash text-xs"></i>
            </button>
          </div>
        </div>

        {/* Enfants */}
        {item.children && item.children.length > 0 && (
          <div className="mt-1">
            {item.children.map(child => renderPlanItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalChapters = plan.reduce((acc, p) => acc + (p.type === 'chapter' ? 1 : (p.children?.filter(c => c.type === 'chapter').length || 0)), 0);
  const totalSections = plan.reduce((acc, p) => {
    const childSections = p.children?.filter(c => c.type === 'section').length || 0;
    const grandChildSections = p.children?.reduce((a, c) => a + ((c.children?.filter(gc => gc.type === 'section').length) || 0), 0) || 0;
    return acc + childSections + grandChildSections;
  }, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-sitemap text-indigo-600"></i>
          Constructeur de Plan
        </h3>
        <div className="text-sm text-gray-500">
          {plan.filter(p => p.type === 'part').length} parties • {totalChapters} chapitres • {totalSections} sections
        </div>
      </div>

      {/* Zone de construction */}
      <div className="min-h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4">
        {plan.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-sitemap text-4xl mb-3 block opacity-50"></i>
            <p>Plan vide — commencez par ajouter une partie ou un chapitre</p>
          </div>
        ) : (
          plan.map(item => renderPlanItem(item))
        )}
      </div>

      {/* Boutons d'ajout */}
      <div className="flex gap-3">
        <button
          onClick={addPart}
          className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-lg flex items-center gap-2"
        >
          <i className="fas fa-layer-group"></i>
          Ajouter une partie
        </button>
        <button
          onClick={() => addChapter()}
          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg flex items-center gap-2"
        >
          <i className="fas fa-book"></i>
          Ajouter un chapitre
        </button>
      </div>

      {/* Aide */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
        <p className="flex items-center gap-2">
          <i className="fas fa-info-circle"></i>
          <strong>Astuce :</strong> Double-cliquez sur un élément pour le renommer. Utilisez les flèches pour réorganiser.
        </p>
      </div>
    </div>
  );
}