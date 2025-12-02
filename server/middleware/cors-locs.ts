/**
 * CORS middleware for LOC assets (PDFs and thumbnails)
 * Allows cross-origin access to /locs/* files
 */
export default defineEventHandler((event) => {
  const path = event.path || ''

  // Only apply to /locs/ paths (PDFs and thumbnails)
  if (path.startsWith('/locs/')) {
    const headers = event.node.res

    // Allow all origins
    headers.setHeader('Access-Control-Allow-Origin', '*')
    headers.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    headers.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    headers.setHeader('Access-Control-Max-Age', '86400')

    // Handle preflight requests
    if (event.method === 'OPTIONS') {
      event.node.res.statusCode = 204
      event.node.res.end()
      return
    }
  }
})
