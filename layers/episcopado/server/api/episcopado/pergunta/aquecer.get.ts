/**
 * Chamado ao abrir a página do Pergunte à Rede: carrega a base e grava o banco SQLite desta instância
 * antes da primeira pergunta. Não chama o modelo.
 */
export default defineEventHandler(async () => {
  try {
    const { version } = await useEpiscopadoAgent()
    return { ok: true, version }
  } catch (error) {
    if (error instanceof PerguntaUnavailable) return { ok: false, motivo: error.message }
    throw error
  }
})
