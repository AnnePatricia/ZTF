// src/utils/permissions.ts
import { UserRole, ZtfDepartment } from '../types/ztf';

export interface PermissionMatrix {
  view_all_books: boolean;
  create_import: boolean;
  modify_file: boolean;
  validate_status: boolean;
  assign_file: boolean;
  send_to_next_dept: boolean;
  view_reports: boolean;
  manage_users: boolean;
  delete_file: boolean;
  configure_system: boolean;
}

export const PERMISSION_MATRIX: Record<string, PermissionMatrix> = {
  admin: {
    view_all_books: true,
    create_import: true,
    modify_file: true,
    validate_status: true,
    assign_file: true,
    send_to_next_dept: true,
    view_reports: true,
    manage_users: true,
    delete_file: true,
    configure_system: true,
  },
  chef: {
    view_all_books: true,
    create_import: true,      // ✅ CHANGÉ: false → true
    modify_file: true,
    validate_status: true,
    assign_file: true,
    send_to_next_dept: true,
    view_reports: true,
    manage_users: false,
    delete_file: false,
    configure_system: false,
  },
  membre: {
    view_all_books: false,
    create_import: true,
    modify_file: true,
    validate_status: false,
    assign_file: false,
    send_to_next_dept: false,
    view_reports: false,
    manage_users: false,
    delete_file: false,
    configure_system: false,
  },
  correcteur_communautaire: {
    view_all_books: false,
    create_import: false,
    modify_file: false,
    validate_status: false,
    assign_file: false,
    send_to_next_dept: false,
    view_reports: false,
    manage_users: false,
    delete_file: false,
    configure_system: false,
  },
};

export function checkPermission(role: UserRole, action: keyof PermissionMatrix): boolean {
  if (role === 'admin') return true;
  const roleType = getRoleType(role);
  return PERMISSION_MATRIX[roleType]?.[action] || false;
}

export function getRoleType(role: UserRole): string {
  if (role === 'admin') return 'admin';
  if (role.startsWith('chef_')) return 'chef';
  if (role.startsWith('membre_')) return 'membre';
  if (role === 'correcteur_communautaire') return 'correcteur_communautaire';
  return 'membre';
}

export function getDepartmentFromRole(role: UserRole): ZtfDepartment | null {
  if (role === 'admin' || role === 'correcteur_communautaire') return null;

  // ✅ Regex case-insensitive pour matcher chef_d2, chef_D2, etc.
  const match = role.match(/_(D[0-8])/i);

  if (!match) return null;

  // ✅ Retourner en majuscules pour cohérence
  return match[1].toUpperCase() as ZtfDepartment;
}

export function isChef(role: UserRole): boolean {
  return role.startsWith('chef_');
}

export function isMembre(role: UserRole): boolean {
  return role.startsWith('membre_');
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function canAccessDepartment(role: UserRole, department: ZtfDepartment): boolean {
  if (isAdmin(role)) return true;
  const userDept = getDepartmentFromRole(role);
  return userDept === department;
}

export function canValidateInDepartment(role: UserRole, department: ZtfDepartment): boolean {
  if (isAdmin(role)) return true;
  if (isChef(role)) {
    const userDept = getDepartmentFromRole(role);
    return userDept === department;
  }
  return false;
}

export function canModifyFile(role: UserRole, fileDepartment: ZtfDepartment, responsibleId: string | null, userId: string): boolean {
  if (isAdmin(role)) return true;
  if (isChef(role)) {
    const userDept = getDepartmentFromRole(role);
    return userDept === fileDepartment;
  }
  if (isMembre(role)) {
    return responsibleId === userId;
  }
  return false;
}

export function getUserDepartment(user: { role: UserRole; department?: string | null } | null): ZtfDepartment | null {
  if (!user) return null;

  // ✅ Priorité 1 : Lire depuis la colonne 'department' (base de données)
  if (user.department) {
    return user.department as ZtfDepartment;
  }

  // ✅ Priorité 2 : Extraire depuis le rôle (fallback)
  return getDepartmentFromRole(user.role);
}