<script setup lang="ts">
definePageMeta({
  middleware: 'ordo-auth',
  layout: false
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
    <div class="ordo-login__texture" aria-hidden="true" />
    <div class="ordo-login__shell">
      <aside class="ordo-login__aside">
        <div class="ordo-login__brand"><span>✦</span><div><small>Caminho Anglicano</small><strong>Portal do Ordo</strong></div></div>
        <div class="ordo-login__quote"><span class="ordo-login__quote-mark">“</span><p>Uma leitura cuidadosa transforma números em cuidado.</p><small>Painel administrativo · acesso restrito</small></div>
        <div class="ordo-login__seal"><span>⌁</span><small>Ad maiorem<br>Dei gloriam</small></div>
      </aside>

      <main class="ordo-login__card">
        <div class="ordo-login__card-top"><span class="ordo-login__eyebrow">Acesso seguro</span><span class="ordo-login__status"><i /> Firebase</span></div>
        <div class="ordo-login__heading"><span class="ordo-login__glyph">◒</span><h1>Bem-vindo<br>de volta.</h1><p>Entre com a conta Google autorizada para acompanhar o ritmo do Ordo.</p></div>
        <div v-if="error" class="ordo-login__error" role="alert"><span>!</span>{{ error }}</div>
        <button type="button" class="ordo-login__google" :disabled="loading" @click="handleGoogleLogin"><span v-if="!loading" class="ordo-login__google-content"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continuar com Google</span><span v-else class="ordo-login__loading"><i /> Autenticando…</span></button>
        <p class="ordo-login__privacy">O token é enviado apenas à API administrativa do Ordo.<br>Você pode sair a qualquer momento.</p>
      </main>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
.ordo-login { --ink: #233328; --moss: #496451; --deep: #20372a; position: relative; display: grid; min-height: 100vh; overflow: hidden; place-items: center; background: #dfe7dc; color: var(--ink); font-family: 'DM Sans', sans-serif; }
.ordo-login__texture { position: absolute; inset: 0; opacity: .38; background-image: linear-gradient(rgba(73,100,81,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(73,100,81,.06) 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(circle at center, black, transparent 78%); }
.ordo-login__shell { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(260px, .78fr) minmax(350px, 1fr); width: min(900px, calc(100% - 36px)); min-height: 525px; overflow: hidden; border: 1px solid rgba(255,255,255,.65); border-radius: 26px; background: rgba(248,250,245,.72); box-shadow: 0 30px 90px rgba(32,55,42,.16); }
.ordo-login__aside { position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 31px; overflow: hidden; background: var(--deep); color: #f3f6ef; }.ordo-login__aside::before { position: absolute; right: -100px; bottom: -100px; width: 320px; height: 320px; border: 1px solid rgba(234,212,162,.24); border-radius: 50%; box-shadow: 0 0 0 24px rgba(234,212,162,.05), 0 0 0 50px rgba(234,212,162,.04); content: ''; }.ordo-login__brand,.ordo-login__brand div { display: flex; }.ordo-login__brand { position: relative; z-index: 1; align-items: center; gap: 11px; }.ordo-login__brand>span { display: grid; width: 35px; height: 35px; place-items: center; border: 1px solid rgba(234,212,162,.45); border-radius: 11px; color: #e7cf9f; }.ordo-login__brand div { flex-direction: column; gap: 3px; }.ordo-login__brand small { color: #a8b9a7; font-size: 8px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }.ordo-login__brand strong { font-family: 'Fraunces', Georgia, serif; font-size: 18px; font-weight: 600; letter-spacing: -.03em; }.ordo-login__quote { position: relative; z-index: 1; max-width: 255px; }.ordo-login__quote-mark { display: block; height: 34px; color: #e7cf9f; font-family: Georgia, serif; font-size: 58px; line-height: .9; }.ordo-login__quote p { margin: 5px 0 14px; font-family: 'Fraunces', Georgia, serif; font-size: 29px; font-weight: 500; letter-spacing: -.04em; line-height: 1.02; }.ordo-login__quote small { color: #a8b9a7; font-size: 10px; }.ordo-login__seal { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; color: #a8b9a7; }.ordo-login__seal span { display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid rgba(234,212,162,.35); border-radius: 50%; color: #e7cf9f; }.ordo-login__seal small { font-size: 9px; line-height: 1.25; }
.ordo-login__card { display: flex; flex-direction: column; justify-content: center; padding: 45px 58px; background: rgba(251,252,248,.82); }.ordo-login__card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.ordo-login__eyebrow { color: #829082; font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }.ordo-login__status { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px; border: 1px solid #dbe5d9; border-radius: 99px; color: #7f8d80; font-size: 9px; font-weight: 700; }.ordo-login__status i { width: 6px; height: 6px; border-radius: 50%; background: #6d9b72; }.ordo-login__heading { margin: 45px 0 28px; }.ordo-login__glyph { display: grid; width: 38px; height: 38px; margin-bottom: 16px; place-items: center; border-radius: 13px; background: #e7f0e5; color: var(--moss); font-size: 20px; }.ordo-login__heading h1 { margin: 0; color: var(--deep); font-family: 'Fraunces', Georgia, serif; font-size: clamp(42px, 5vw, 58px); font-weight: 600; letter-spacing: -.06em; line-height: .89; }.ordo-login__heading p { max-width: 340px; margin: 18px 0 0; color: #7d8a7f; font-size: 12px; line-height: 1.55; }.ordo-login__error { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; padding: 10px 11px; border: 1px solid #efd8d1; border-radius: 10px; background: #fdf3f0; color: #a5675e; font-size: 11px; line-height: 1.4; }.ordo-login__error span { display: grid; flex: 0 0 auto; width: 18px; height: 18px; place-items: center; border-radius: 50%; background: #f3d8d0; color: #a35c50; font-weight: 800; }.ordo-login__google { width: 100%; min-height: 48px; border: 1px solid #d4ddd2; border-radius: 11px; background: #fff; color: #3c4043; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; box-shadow: 0 6px 14px rgba(38,55,44,.06); transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease; }.ordo-login__google:hover:not(:disabled) { background: #f9fbf8; box-shadow: 0 10px 22px rgba(38,55,44,.1); transform: translateY(-1px); }.ordo-login__google:disabled { cursor: wait; opacity: .65; }.ordo-login__google-content,.ordo-login__loading { display: inline-flex; align-items: center; justify-content: center; gap: 10px; }.ordo-login__google svg { width: 18px; height: 18px; }.ordo-login__loading i { width: 15px; height: 15px; border: 2px solid #cbd8c9; border-top-color: var(--moss); border-radius: 50%; animation: ordo-login-spin 800ms linear infinite; }.ordo-login__privacy { margin: 20px 0 0; color: #a0aaa0; font-size: 9px; line-height: 1.5; text-align: center; }
@keyframes ordo-login-spin { to { transform: rotate(360deg); } }
@media (max-width: 680px) { .ordo-login__shell { grid-template-columns: 1fr; width: min(440px, calc(100% - 24px)); min-height: 0; }.ordo-login__aside { min-height: 190px; padding: 23px; }.ordo-login__quote { margin-top: 35px; }.ordo-login__quote p { font-size: 23px; }.ordo-login__seal { display: none; }.ordo-login__card { padding: 31px 25px 29px; }.ordo-login__heading { margin: 33px 0 24px; } }
</style>
