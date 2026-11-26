<template>
  <div class="min-h-screen flex flex-col">
    <NuxtPage />
  </div>
</template>

<style>
/* Same inline reset as the site's app.vue, so the portal sits on the same base. */
html {
  opacity: 1;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
