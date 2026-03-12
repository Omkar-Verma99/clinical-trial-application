export const BASE_ADMIN_PERMISSIONS = [
  'view_dashboard',
  'view_doctors',
  'view_patients',
  'edit_patient_records',
  'view_analytics',
  'view_operations',
  'view_data_quality',
  'view_safety',
  'view_cohorts',
  'export_data',
  'schedule_exports',
] as const

export const SUPER_ADMIN_EXTRA_PERMISSIONS = [
  'manage_admins',
  'view_audit_logs',
  'change_settings',
  'delete_patient_records',
  'approve_high_risk_actions',
  'manage_quality_reviews',
  'manage_safety_escalations',
  'manage_cohorts',
  'manage_automation',
  'manage_protocol_rules',
  'manage_system_config',
  'manage_roles',
] as const

export const ALL_ADMIN_PERMISSIONS = [
  ...BASE_ADMIN_PERMISSIONS,
  ...SUPER_ADMIN_EXTRA_PERMISSIONS,
] as const

export type AdminPermission = (typeof ALL_ADMIN_PERMISSIONS)[number]

export type AdminRole = 'admin' | 'super_admin'

export function getDefaultPermissionsForRole(role: AdminRole): AdminPermission[] {
  if (role === 'super_admin') {
    return [...ALL_ADMIN_PERMISSIONS]
  }
  return [...BASE_ADMIN_PERMISSIONS]
}

export function sanitizePermissions(role: AdminRole, input: unknown): AdminPermission[] {
  if (role === 'super_admin') {
    return [...ALL_ADMIN_PERMISSIONS]
  }

  const selected = Array.isArray(input) ? input : []
  const selectedSet = new Set(selected.map((item) => String(item)))
  return ALL_ADMIN_PERMISSIONS.filter((permission) => selectedSet.has(permission))
}