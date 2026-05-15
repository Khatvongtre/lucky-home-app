const roleLabels = {
  SuperAdmin: 'Quản trị viên',
  Owner: 'Chủ nhà',
  Manager: 'Quản lý',
  Staff: 'Nhân viên',
};

export const usePermissions = ({ selectedHouse, user }) => {
  const currentRole = selectedHouse?.userRole;
  const effectiveRole = currentRole || user?.role;
  const isGlobalOwner = ['SuperAdmin', 'Owner'].includes(user?.role);

  return {
    currentRole,
    effectiveRole,
    isOwnerOrAdmin: ['SuperAdmin', 'Owner'].includes(effectiveRole) || isGlobalOwner,
    isManagerOrAbove: ['SuperAdmin', 'Owner', 'Manager'].includes(effectiveRole) || isGlobalOwner,
    canAccessFinance: ['SuperAdmin', 'Owner', 'Manager', 'Staff'].includes(effectiveRole) || isGlobalOwner,
    canViewProfit: ['SuperAdmin', 'Owner', 'Manager'].includes(effectiveRole) || isGlobalOwner,
    canManageTransactions: ['SuperAdmin', 'Owner', 'Manager'].includes(effectiveRole) || isGlobalOwner,
    getRoleLabel: (role) => roleLabels[role] || role || 'Tài khoản',
  };
};
