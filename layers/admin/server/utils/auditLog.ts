import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

/**
 * Audit log actions
 */
export enum AuditAction {
  CHURCH_CREATED = 'church_created',
  CHURCH_UPDATED = 'church_updated',
  CHURCH_DELETED = 'church_deleted',
  SUBMISSION_APPROVED = 'submission_approved',
  SUBMISSION_REJECTED = 'submission_rejected',
  SUBMISSION_UPDATED = 'submission_updated',
  BULK_SUBMISSION_APPROVED = 'bulk_submission_approved',
  BULK_SUBMISSION_REJECTED = 'bulk_submission_rejected',
  BULK_SUBMISSION_APPROVED_NO_INSERT = 'bulk_submission_approved_no_insert',
  ADMIN_LOGIN = 'admin_login',
  ADMIN_LOGOUT = 'admin_logout',
}

interface AuditLogEntry {
  action: AuditAction
  resource_type: string
  resource_id: string
  admin_email: string
  metadata?: Record<string, any>
  ip_address?: string
}

/**
 * Log an audit event
 * In a real system, this would write to a dedicated audit_logs table
 * For now, we'll log to console and could extend to database
 */
export async function logAudit(
  event: H3Event,
  entry: Omit<AuditLogEntry, 'ip_address'>,
): Promise<void> {
  const ip = getClientIP(event)

  const auditEntry: AuditLogEntry = {
    ...entry,
    ip_address: ip,
  }

  // Log to console (in production, this would go to a logging service)
  console.log('[AUDIT]', JSON.stringify({
    timestamp: new Date().toISOString(),
    ...auditEntry,
  }))

  // TODO: In production, also save to database audit_logs table
  // This would require creating a new table in Supabase:
  // CREATE TABLE audit_logs (
  //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  //   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  //   action TEXT NOT NULL,
  //   resource_type TEXT NOT NULL,
  //   resource_id TEXT NOT NULL,
  //   admin_email TEXT NOT NULL,
  //   metadata JSONB,
  //   ip_address TEXT
  // );

  /*
  const config = useRuntimeConfig()
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  await supabase.from('audit_logs').insert({
    action: auditEntry.action,
    resource_type: auditEntry.resource_type,
    resource_id: auditEntry.resource_id,
    admin_email: auditEntry.admin_email,
    metadata: auditEntry.metadata || null,
    ip_address: auditEntry.ip_address || null,
  })
  */
}

/**
 * Get client IP address from event
 */
function getClientIP(event: H3Event): string {
  const headers = getHeaders(event)
  const forwarded = headers['x-forwarded-for']
  const real = headers['x-real-ip']
  const cloudflare = headers['cf-connecting-ip']

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  if (typeof real === 'string') {
    return real
  }
  if (typeof cloudflare === 'string') {
    return cloudflare
  }

  return 'unknown'
}

/**
 * Get admin email from event
 * Assumes the event has already been authenticated
 */
export async function getAdminEmail(event: H3Event): Promise<string> {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return 'unknown'
  }

  const token = authHeader.substring(7)

  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    const { data } = await supabase.auth.getUser(token)
    return data.user?.email || 'unknown'
  }
  catch {
    return 'unknown'
  }
}
