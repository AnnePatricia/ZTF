// src/components/common/RoleGuard.tsx
import { ReactNode } from 'react';
import { useRoles } from '../../hooks/useRoles';
import { canAccessDepartment } from '../../utils/permissions';

interface RoleGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: 'admin' | 'chef' | 'membre';
  requiredDepartment?: string;
  fallback?: ReactNode;
}

export default function RoleGuard({ 
  children, 
  requiredPermission, 
  requiredRole,
  requiredDepartment,
  fallback = null 
}: RoleGuardProps) {
  const { 
    currentUser, 
    loading, 
    hasPermission, 
    isChef, 
    isMembre, 
    isAdmin,
    // getDepartment 
  } = useRoles();

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <i className="fas fa-spinner fa-spin mr-2"></i>
        Chargement...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-4 text-center text-red-500">
        <i className="fas fa-exclamation-circle mr-2"></i>
        Non authentifié
      </div>
    );
  }

  // Vérifier le rôle
  if (requiredRole) {
    if (requiredRole === 'admin' && !isAdmin()) return <>{fallback}</>;
    if (requiredRole === 'chef' && !isChef()) return <>{fallback}</>;
    if (requiredRole === 'membre' && !isMembre()) return <>{fallback}</>;
  }

  // Vérifier la permission
  if (requiredPermission && hasPermission && !hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  // Vérifier le département
  if (requiredDepartment && currentUser.role) {
    if (!canAccessDepartment(currentUser.role, requiredDepartment as any)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}