// =====================================================
// COMPOSANT: RoleBadge
// Description: Affiche un badge coloré selon le rôle technique
// =====================================================

import React from "react";
import { UserRole, getRoleBadgeConfig, getRoleDescription } from "../../hooks/useUserRoles";

interface RoleBadgeProps {
  role: UserRole;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showTooltip = false,
  size = 'md',
}) => {
  const config = getRoleBadgeConfig(role);
  const description = getRoleDescription(role);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.color} ${sizeClasses[size]}`}
      title={showTooltip ? description : undefined}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );

  return badge;
};

export default RoleBadge;
