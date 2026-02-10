<script setup lang="ts">
definePageMeta({
  middleware: 'ordo-auth',
  layout: false
})

const { loginWithGoogle, error, loading } = useFirebaseAuth()
const isClient = ref(false)

onMounted(() => {
  isClient.value = true
})

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
  <ClientOnly>
    <div class="ordo-login">
    <div class="ordo-login__background">
      <div class="ordo-login__gradient" />
      <div class="ordo-login__pattern" />
    </div>

    <div class="ordo-login__container">
      <div class="ordo-login__card">
        <!-- Logo/Header -->
        <div class="ordo-login__header">
          <div class="ordo-login__icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 class="ordo-login__title">Portal do Ordo</h1>
          <p class="ordo-login__subtitle">Painel Administrativo</p>
        </div>

        <!-- Login Options -->
        <div class="ordo-login__form">
          <div v-if="error" class="ordo-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {{ error }}
          </div>

          <button
            type="button"
            class="ordo-button ordo-button--google"
            @click="handleGoogleLogin"
            :disabled="loading"
          >
            <span v-if="!loading" class="ordo-button__content">
              <svg viewBox="0 0 24 24" class="ordo-button__google-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </span>
            <span v-else class="ordo-button__loading">
              <svg class="ordo-spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
              </svg>
              Autenticando...
            </span>
          </button>
        </div>

        <!-- Footer -->
        <div class="ordo-login__footer">
          <p>Acesso restrito ao administrador</p>
        </div>
      </div>
    </div>
  </div>
  </ClientOnly>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');

.ordo-login {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Manrope', sans-serif;
}

.ordo-login__background {
  position: absolute;
  inset: 0;
  background: #1a1410;
}

.ordo-login__gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(139, 69, 19, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(184, 134, 11, 0.1) 0%, transparent 50%);
}

.ordo-login__pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 100px 100px;
  opacity: 0.3;
}

.ordo-login__container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 460px;
  padding: 24px;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ordo-login__card {
  background: rgba(245, 240, 230, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 69, 19, 0.1);
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.ordo-login__header {
  text-align: center;
  margin-bottom: 40px;
}

.ordo-login__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #F5F0E6;
  box-shadow:
    0 8px 24px rgba(139, 69, 19, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.ordo-login__icon svg {
  width: 32px;
  height: 32px;
}

.ordo-login__title {
  font-family: 'Crimson Text', serif;
  font-size: 36px;
  font-weight: 700;
  color: #2c1810;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
}

.ordo-login__subtitle {
  font-size: 14px;
  font-weight: 500;
  color: #8B4513;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

.ordo-login__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ordo-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;
  animation: shake 0.3s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.ordo-error svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.ordo-button {
  padding: 16px 24px;
  background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
  border: none;
  border-radius: 10px;
  color: #F5F0E6;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
}

.ordo-button--google {
  background: #fff;
  color: #3c4043;
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ordo-button--google:hover:not(:disabled) {
  background: #f8f9fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.ordo-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 69, 19, 0.4);
}

.ordo-button:active:not(:disabled) {
  transform: translateY(0);
}

.ordo-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ordo-button__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.ordo-button__google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.ordo-button__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.ordo-spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ordo-login__footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(139, 69, 19, 0.1);
  text-align: center;
}

.ordo-login__footer p {
  font-size: 13px;
  color: rgba(44, 24, 16, 0.6);
  margin: 0;
  font-weight: 500;
}

@media (max-width: 640px) {
  .ordo-login__card {
    padding: 36px 28px;
  }

  .ordo-login__title {
    font-size: 28px;
  }
}
</style>
