// src/hooks/useDepartmentAccess.ts
import { useRoles } from './useRoles';

export interface DepartmentAccess {
  canViewModule: (dept: string) => boolean;
  canEditModule: (dept: string) => boolean;
  canValidate: (dept: string) => boolean;
  canCreateTask: (dept: string) => boolean;
  currentDepartment: string | null;
  isReadOnly: boolean;
}

export function useDepartmentAccess(): DepartmentAccess {
  const { currentUser, isAdmin, isChef } = useRoles();

  const currentDepartment = currentUser?.department || null;
  const isReadOnly = currentDepartment === 'D0';

  // Chef D0 : peut voir tous les modules mais en lecture seule
  // Chef D2-D8 : peut voir uniquement son module
  // Admin : peut tout voir et tout modifier
  const canViewModule = (dept: string): boolean => {
    if (!currentUser) return false;
    if (isAdmin()) return true;
    if (!isChef()) return false;

    if (currentDepartment === 'D0') {
      return true; // D0 voit tout
    }

    return currentDepartment === dept;
  };

  // Seul le chef du département peut modifier
  const canEditModule = (dept: string): boolean => {
    if (!currentUser) return false;
    if (isAdmin()) return true;
    if (!isChef()) return false;
    if (currentDepartment === 'D0') return false; // D0 ne peut rien modifier
    return currentDepartment === dept;
  };

  // Seul le chef du département peut valider
  const canValidate = (dept: string): boolean => {
    return canEditModule(dept);
  };

  // Seul le chef du département peut créer des tâches
  const canCreateTask = (dept: string): boolean => {
    return canEditModule(dept);
  };

  return {
    canViewModule,
    canEditModule,
    canValidate,
    canCreateTask,
    currentDepartment,
    isReadOnly,
  };
}