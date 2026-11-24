<script setup lang="ts">
import '../../assets/portal.css'

definePageMeta({
  middleware: 'ordo-auth',
  layout: false
})

useHead({
  title: 'Entrar · Portal do Ordo',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Raleway:wght@400;500;600;700&display=swap' }
  ]
})

const { loginWithGoogle, error, loading } = useFirebaseAuth()

const handleGoogleLogin = async () => {
  try {
    await loginWithGoogle()
    await navigateTo('/portal-do-ordo')
  } catch (err) {
    console.error('Login error:', err)
  }
}
</script>

<template>
  <div class="ordo-login">
    <section class="login-aside" aria-label="Ordo">
      <svg class="login-aside__arch" viewBox="0 0 400 560" aria-hidden="true">
        <defs>
          <clipPath id="login-arch"><path d="M24 560V262C24 132 104 48 200 8c96 40 176 124 176 254v298z" /></clipPath>
        </defs>
        <g clip-path="url(#login-arch)">
          <rect width="400" height="560" fill="#112e50" />
          <circle cx="200" cy="250" r="230" fill="#14365e" />
          <circle cx="200" cy="250" r="160" fill="#18406e" />
          <circle cx="200" cy="250" r="92" fill="#1d4b80" />
        </g>
        <path d="M24 560V262C24 132 104 48 200 8c96 40 176 124 176 254v298z" fill="none" stroke="#a8801a" stroke-width="2" stroke-opacity=".55" />
        <path d="M200 8v552M24 300h352" stroke="#0d2744" stroke-width="16" />
      </svg>

      <div class="login-aside__brand">
        <img src="/ordo/icon.png" alt="" width="48" height="48">
        <div>
          <strong>Ordo</strong>
          <span>Portal · Caminho Anglicano</span>
        </div>
      </div>

      <div class="login-aside__quote">
        <p>Uma leitura cuidadosa transforma números em cuidado.</p>
        <i aria-hidden="true" />
        <span>O painel de quem cuida do Ordo: o ritmo da oração, as filas de revisão e a narração do ofício, num só lugar.</span>
      </div>
    </section>

    <main class="login-main" aria-labelledby="login-title">
      <div class="login-main__inner">
        <div class="login-main__head">
          <span class="op-pill op-pill--info">Acesso restrito</span>
          <h1 id="login-title">Bem-vindo de volta.</h1>
          <p>Entre com a conta Google autorizada para acompanhar o ritmo do Ordo.</p>
        </div>

        <div class="op-card login-main__card">
          <button type="button" class="login-google" :disabled="loading" @click="handleGoogleLogin">
            <span v-if="loading" class="login-google__spinner" aria-hidden="true" />
            <svg v-else viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            {{ loading ? 'Entrando…' : 'Continuar com Google' }}
          </button>
          <div v-if="error" class="op-inline-error" role="alert">{{ error }}</div>
        </div>

        <p class="login-main__privacy">O token vai só para a API administrativa do Ordo. Você pode sair a qualquer momento.</p>
        <div class="login-main__foot">
          <span>Ordo · Caminho Anglicano</span>
          <a href="https://www.oficio.app" class="op-link">Ir para oficio.app</a>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-aside { position: relative; display: flex; flex: 1 1 520px; flex-direction: column; justify-content: space-between; gap: 40px; min-height: 100vh; overflow: hidden; padding: 48px 56px; background: var(--op-rail); color: var(--op-rail-ink); }
.login-aside__arch { position: absolute; right: -150px; bottom: -40px; width: 460px; height: 644px; opacity: .85; }
.login-aside__brand { position: relative; display: flex; align-items: center; gap: 14px; }
.login-aside__brand img { width: 48px; height: 48px; border-radius: 12px; box-shadow: 0 0 0 1px rgba(251, 248, 240, .2); }
.login-aside__brand div { display: flex; flex-direction: column; gap: 4px; }
.login-aside__brand strong { font-family: var(--op-font-display); font-size: 30px; font-weight: 600; line-height: 1; }
.login-aside__brand span { color: var(--op-gold-light); font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
.login-aside__quote { position: relative; display: flex; flex-direction: column; gap: 18px; max-width: 400px; margin-bottom: 40px; }
.login-aside__quote p { margin: 0; font-family: var(--op-font-display); font-size: 40px; font-style: italic; font-weight: 500; line-height: 1.15; }
.login-aside__quote i { width: 56px; height: 3px; background: var(--op-gold); }
.login-aside__quote span { color: var(--op-rail-soft); font-size: 15px; line-height: 1.6; }
.login-main { display: grid; flex: 1 1 460px; place-items: center; padding: 48px 24px; }
.login-main__inner { display: flex; flex-direction: column; gap: 26px; width: 100%; max-width: 420px; }
.login-main__head { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.login-main__head h1 { margin: 0; font-family: var(--op-font-display); font-size: 44px; font-weight: 500; line-height: 1.08; letter-spacing: -.02em; }
.login-main__head p { margin: 0; color: var(--op-ink-soft); font-size: 16px; line-height: 1.6; }
.login-main__card { display: flex; flex-direction: column; gap: 14px; }
.login-google { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 54px; padding: 0 22px; border: 1.5px solid rgba(13, 39, 68, .16); border-radius: 999px; background: var(--op-card); color: var(--op-ink); cursor: pointer; font-size: 15.5px; font-weight: 600; transition: transform .15s, border-color .15s, box-shadow .15s; }
.login-google:hover { border-color: var(--op-action); box-shadow: 0 10px 24px -14px rgba(23, 84, 207, .6); transform: translateY(-1px); }
.login-google:disabled { cursor: wait; opacity: .7; transform: none; }
.login-google__spinner { width: 18px; height: 18px; border: 2px solid var(--op-wash); border-top-color: var(--op-action); border-radius: 999px; animation: login-spin .8s linear infinite; }
.login-main__privacy { margin: 0; color: var(--op-ink-faint); font-size: 13px; line-height: 1.6; }
.login-main__foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding-top: 20px; border-top: 1px solid var(--op-hair); color: var(--op-ink-faint); font-size: 13px; }
@keyframes login-spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .login-aside { min-height: 0; padding: 28px 24px; }
  .login-aside__arch { width: 260px; height: 364px; right: -60px; bottom: -80px; opacity: .6; }
  .login-aside__quote { margin-bottom: 0; }
  .login-aside__quote p { font-size: 28px; }
  .login-aside__quote span { display: none; }
  .login-main__head h1 { font-size: 34px; }
}
</style>
