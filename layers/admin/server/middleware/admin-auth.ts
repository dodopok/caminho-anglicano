/**
 * Server middleware to protect admin API routes
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  // Only protect /api/admin/* routes
  if (path.startsWith('/api/admin/')) {
    await requireAdmin(event)
  }
})
