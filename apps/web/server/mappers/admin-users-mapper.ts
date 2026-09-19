import type { UserRole } from '@repo/api-contracts';
import type { AdminUsersReadModel } from '../queries/admin-users-query';

type StatusTone = 'success' | 'warning' | 'danger' | 'info';

export type AdminUserRowViewModel = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  roleTone: StatusTone;
  statusLabel: string;
  statusTone: StatusTone;
  createdAtLabel: string;
  lastLoginLabel: string;
  isSelf: boolean;
  isAdmin: boolean;
  /** The role this user would be toggled to (the opposite of the current role). */
  nextRole: UserRole;
  nextRoleActionLabel: string;
};

export type AdminEventRowViewModel = {
  id: string;
  summary: string;
  actorEmail: string;
  createdAtLabel: string;
};

export type AdminUsersViewModel = {
  title: string;
  description: string;
  totalCount: number;
  adminCount: number;
  memberCount: number;
  rows: AdminUserRowViewModel[];
  recentEvents: AdminEventRowViewModel[];
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: string): StatusTone {
  if (status === 'active') return 'success';
  if (status === 'pending_verification') return 'warning';
  if (status === 'disabled') return 'danger';
  return 'info';
}

function statusLabel(status: string): string {
  if (status === 'pending_verification') return 'Pending verification';
  if (status === 'active') return 'Active';
  if (status === 'disabled') return 'Disabled';
  return status;
}

/**
 * Pure transformation from the raw user read model to a display-ready view
 * model. `currentUserId` is used to flag the viewer's own row so the UI can
 * disable self role changes (mirroring the server action guard).
 */
export function mapAdminUsersViewModel(
  readModel: AdminUsersReadModel,
  currentUserId: string,
): AdminUsersViewModel {
  const rows: AdminUserRowViewModel[] = readModel.users.map((user) => {
    const isAdmin = user.role === 'admin';
    const nextRole: UserRole = isAdmin ? 'member' : 'admin';
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleLabel: isAdmin ? 'Admin' : 'Member',
      roleTone: isAdmin ? 'info' : 'success',
      statusLabel: statusLabel(user.status),
      statusTone: statusTone(user.status),
      createdAtLabel: formatTimestamp(user.createdAt),
      lastLoginLabel: formatTimestamp(user.lastLoginAt),
      isSelf: user.id === currentUserId,
      isAdmin,
      nextRole,
      nextRoleActionLabel: isAdmin ? 'Revoke admin' : 'Make admin',
    };
  });

  const adminCount = rows.filter((row) => row.isAdmin).length;

  const emailById = new Map(readModel.users.map((user) => [user.id, user.email] as const));
  const recentEvents: AdminEventRowViewModel[] = readModel.recentEvents.map((event) => {
    const targetLabel =
      (event.targetUserId ? emailById.get(event.targetUserId) : null) ??
      (event.targetUserId ? `user ${event.targetUserId.slice(0, 8)}…` : 'unknown user');
    const before = event.beforeValue ?? '—';
    const after = event.afterValue ?? '—';
    return {
      id: event.id,
      summary: `Role ${before} → ${after} for ${targetLabel}`,
      actorEmail: event.actorEmail,
      createdAtLabel: formatTimestamp(event.createdAt),
    };
  });

  return {
    title: 'User management',
    description: 'Review registered users and grant or revoke administrator access.',
    totalCount: rows.length,
    adminCount,
    memberCount: rows.length - adminCount,
    rows,
    recentEvents,
  };
}
