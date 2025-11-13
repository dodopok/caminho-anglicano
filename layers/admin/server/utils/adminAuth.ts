import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

/**
 * Verifies if the authenticated user is an admin
 */
export async function isAdmin(event: H3Event): Promise<boolean> {
  const config = useRuntimeConfig()
  const adminEmail = config.adminEmail

  if (!adminEmail) {
    console.error('ADMIN_EMAIL not configured in environment')
    return false
  }

  // Get the authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)

  // Create Supabase client
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Verify the JWT token
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return false
    }

    // Check if user email matches admin email
    return data.user.email === adminEmail
  }
  catch (error) {
    console.error('Error verifying admin:', error)
    return false
  }
}

/**
 * Ensures the request is from an authenticated admin
 * Throws 401 or 403 if not
 */
export async function requireAdmin(event: H3Event): Promise<void> {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  const admin = await isAdmin(event)

  if (!admin) {
    throw createError({
      statusCode: 403,
      message: 'Admin access required',
    })
  }
}
