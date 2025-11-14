export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  
  hooks: {
    'pages:extend'(pages) {
      // Remove /admin routes and create only /portal-do-douglas routes
      const adminPages = pages.filter(page => page.path.startsWith('/admin'))
      
      // Remove admin routes from pages array
      const adminPaths = adminPages.map(p => p.path)
      const filteredPages = pages.filter(page => !adminPaths.includes(page.path))
      
      // Clear and repopulate with filtered pages
      pages.length = 0
      pages.push(...filteredPages)
      
      // Add only portal-do-douglas routes
      adminPages.forEach(page => {
        pages.push({
          ...page,
          path: page.path.replace(/^\/admin/, '/portal-do-douglas'),
        })
      })
    },
  },
})
