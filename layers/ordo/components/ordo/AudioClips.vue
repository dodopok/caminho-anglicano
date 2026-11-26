<script setup lang="ts">
import OrdoBookPicker from './BookPicker.vue'
import OrdoIcon from './Icon.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { errorText } from '../../composables/useReport'
import { number, plural } from '../../utils/audio'
import type { AudioClip, AudioClipCandidate, AudioClipFilters, AudioProfileStatus } from '../../types/dashboard'

// The clip catalogue: listen, adjust one text's note and ask for a new
// attempt; approve or discard the attempts waiting for someone. Same content
// as before the redesign, in the portal's own pieces.
const store = useAudioStore()
const ordo = useOrdoApi()
const { formatDuration, formatTimestamp } = useOrdoDashboardPresentation()

const PAGE = 20
const clips = ref<AudioClip[]>([])
const pagination = ref({ total: 0, limit: PAGE, offset: 0, count: 0 })
const loading = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const bookFilter = ref('')
const profileFilter = ref<'all' | AudioProfileStatus>('all')
const providerFilter = ref('')
const voiceFilter = ref('')
const maxCharacters = ref('')
const offset = ref(0)
const moreFilters = ref(false)
const instructions = ref<Record<string, string>>({})
const expanded = ref<Record<string, boolean>>({})
const busy = ref<Record<string, boolean>>({})

const profiles = computed(() => store.summary.data?.profiles || [])
const providers = computed(() => [...new Set(profiles.value.map(profile => profile.provider).filter(Boolean))] as string[])
const voices = computed(() => [...new Set(profiles.value.map(profile => profile.voice).filter(Boolean))] as string[])
const extraFilters = computed(() => [providerFilter.value, voiceFilter.value, maxCharacters.value].filter(Boolean).length)
const pages = computed(() => Math.max(1, Math.ceil(pagination.value.total / PAGE)))
const page = computed(() => Math.floor(offset.value / PAGE) + 1)

const filters = (): AudioClipFilters => ({
  limit: PAGE,
  offset: offset.value,
  sort: 'created_at',
  direction: 'desc',
  ...(search.value.trim() ? { q: search.value.trim() } : {}),
  ...(bookFilter.value ? { prayer_book_code: bookFilter.value } : {}),
  ...(profileFilter.value !== 'all' ? { profile_status: profileFilter.value } : {}),
  ...(providerFilter.value ? { provider: providerFilter.value } : {}),
  ...(voiceFilter.value ? { voice: voiceFilter.value } : {}),
  ...(maxCharacters.value ? { max_characters: maxCharacters.value } : {})
})

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await ordo.fetchAudioClips(filters())
    clips.value = response.clips || []
    pagination.value = response.pagination || { total: 0, limit: PAGE, offset: offset.value, count: 0 }
    clips.value.forEach(clip => {
      const id = String(clip.id)
      if (!(id in instructions.value)) instructions.value[id] = clip.customization?.instructions || ''
    })
  } catch (caught) {
    error.value = errorText(caught) || 'Não foi possível ler os clips.'
  } finally {
    loading.value = false
  }
}

const apply = () => {
  offset.value = 0
  void load()
}
const turn = (direction: number) => {
  const next = offset.value + direction * PAGE
  if (next < 0 || next >= pagination.value.total) return
  offset.value = next
  void load()
}

const setBusy = (key: string, value: boolean) => { busy.value = { ...busy.value, [key]: value } }

const refreshUrl = async (clip: AudioClip) => {
  const key = String(clip.id)
  setBusy(key, true)
  try {
    const response = await ordo.fetchAudioClipUrl(clip.id)
    clips.value = clips.value.map(item => item.id === clip.id ? { ...item, audio_url: response.url } : item)
  } catch (caught) {
    error.value = errorText(caught) || 'Não foi possível renovar a URL.'
  } finally {
    setBusy(key, false)
  }
}

const regenerate = async (clip: AudioClip) => {
  const key = String(clip.id)
  const note = (instructions.value[key] ?? clip.customization?.instructions ?? '').trim()
  if (!window.confirm(`Gerar uma nova tentativa para “${clip.text.slice(0, 80)}”? O áudio atual continuará intacto até você aprovar a tentativa.`)) return
  setBusy(key, true)
  try {
    const response = await ordo.regenerateAudioClip(clip.id, note || undefined)
    store.track(response.operation)
  } catch (caught) {
    error.value = errorText(caught) || 'Não foi possível pedir a nova tentativa.'
  } finally {
    setBusy(key, false)
  }
}

const candidateKey = (clip: AudioClip, candidate: AudioClipCandidate) => `${clip.id}:candidate:${candidate.id}`
const pending = (clip: AudioClip) => (clip.candidates || []).filter(candidate => candidate.status === 'pending')
const reviewed = (clip: AudioClip) => (clip.candidates || []).filter(candidate => candidate.status !== 'pending')

const accept = async (clip: AudioClip, candidate: AudioClipCandidate) => {
  if (!window.confirm('Aprovar esta tentativa? Ela substituirá o áudio oficial deste texto.')) return
  const key = candidateKey(clip, candidate)
  setBusy(key, true)
  try {
    await ordo.acceptAudioClipCandidate(clip.id, candidate.id)
    await Promise.all([load(), store.refresh()])
  } catch (caught) {
    error.value = errorText(caught) || 'Não foi possível aprovar.'
  } finally {
    setBusy(key, false)
  }
}

const reject = async (clip: AudioClip, candidate: AudioClipCandidate) => {
  if (!window.confirm('Descartar esta tentativa e apagar o arquivo gerado?')) return
  const key = candidateKey(clip, candidate)
  setBusy(key, true)
  try {
    await ordo.rejectAudioClipCandidate(clip.id, candidate.id)
    await load()
  } catch (caught) {
    error.value = errorText(caught) || 'Não foi possível descartar.'
  } finally {
    setBusy(key, false)
  }
}

const PROFILE: Record<string, { label: string; tone: string }> = {
  current: { label: 'Atual', tone: 'ok' },
  stale: { label: 'Instruções antigas', tone: 'gold' },
  legacy: { label: 'Sem registro de versão', tone: 'danger' }
}
const CANDIDATE: Record<string, { label: string; tone: string }> = {
  pending: { label: 'aguardando revisão', tone: 'gold' },
  accepted: { label: 'aprovada', tone: 'ok' },
  rejected: { label: 'descartada', tone: 'danger' }
}
const usage = (clip: AudioClip) => {
  const usages = clip.usages || []
  const shown = usages.slice(0, 2).map(item => `${item.prayer_book_code} / ${item.source_name}`)
  const hidden = usages.length - shown.length
  return hidden ? `${shown.join(' · ')} · +${hidden} ${hidden === 1 ? 'uso' : 'usos'}` : shown.join(' · ')
}
const short = (value?: string | null) => value ? value.slice(0, 12) : '—'
const toggle = (clip: AudioClip) => { expanded.value = { ...expanded.value, [String(clip.id)]: !expanded.value[String(clip.id)] } }

onMounted(load)
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Revisão individual</p>
        <h2>Catálogo de clips</h2>
        <p>Ouça, ajuste a observação de um texto e gere uma nova tentativa. O player usa URL assinada do storage.</p>
      </div>
      <span v-if="pagination.total" class="op-pill op-pill--quiet">{{ plural(pagination.total, 'clip', 'clips') }}</span>
    </div>

    <div class="op-audio-filters">
      <label class="op-label op-audio-filters__wide">Texto
        <input v-model="search" class="op-field" type="search" placeholder="ex.: Pai nosso…" @keyup.enter="apply">
      </label>
      <OrdoBookPicker v-model="bookFilter" compact empty-label="Todos os livros" :books="store.books.value" @update:model-value="apply" />
      <label class="op-label">Versão da voz
        <select v-model="profileFilter" class="op-field" @change="apply">
          <option value="all">Todos</option>
          <option value="current">Atual</option>
          <option value="stale">Instruções antigas</option>
          <option value="legacy">Sem registro de versão</option>
        </select>
      </label>
      <button type="button" class="op-btn op-btn--small" :aria-expanded="moreFilters" @click="moreFilters = !moreFilters">Mais filtros<span v-if="extraFilters" class="op-count">{{ extraFilters }}</span></button>
      <button type="button" class="op-btn op-btn--small op-btn--primary" :disabled="loading" @click="apply">{{ loading ? 'Buscando…' : 'Buscar' }}</button>
    </div>
    <div v-if="moreFilters" class="op-audio-filters op-audio-filters--more">
      <label class="op-label">Provedor
        <select v-model="providerFilter" class="op-field" @change="apply">
          <option value="">Todos</option>
          <option v-for="item in providers" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label class="op-label">Voz
        <select v-model="voiceFilter" class="op-field" @change="apply">
          <option value="">Todas</option>
          <option v-for="item in voices" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label class="op-label">Textos curtos
        <select v-model="maxCharacters" class="op-field" @change="apply">
          <option value="">Todos</option>
          <option value="30">Até 30 caracteres</option>
          <option value="60">Até 60 caracteres</option>
          <option value="120">Até 120 caracteres</option>
        </select>
      </label>
    </div>

    <p v-if="error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ error }}</p>
    <p v-if="loading && !clips.length" class="op-empty">Lendo clips…</p>
    <p v-else-if="!clips.length" class="op-empty">Nenhum clip corresponde aos filtros.</p>
    <ul v-else class="op-audio-clips" :style="{ opacity: loading ? .55 : 1 }">
      <li v-for="clip in clips" :key="clip.id" class="op-audio-clip" :class="{ 'is-open': expanded[String(clip.id)] }">
        <div class="op-audio-clip__row">
          <div style="min-width: 0">
            <div class="op-flex" style="gap: 6px 8px; font-size: 12px; color: var(--op-ink-faint)">
              <span class="op-pill" :class="`op-pill--${PROFILE[clip.profile_status || '']?.tone || 'quiet'}`">{{ PROFILE[clip.profile_status || '']?.label || clip.profile_status || 'desconhecido' }}</span>
              <span v-if="pending(clip).length" class="op-pill op-pill--gold">{{ plural(pending(clip).length, 'tentativa', 'tentativas') }} a revisar</span>
              <span>{{ clip.kind }} / {{ clip.line_type || 'linha' }} · {{ formatDuration(clip.duration) }} · {{ number(clip.character_count) }} caracteres</span>
            </div>
            <p class="op-audio-clip__text" :class="{ 'is-clamped': !expanded[String(clip.id)] }">{{ clip.text }}</p>
            <small v-if="clip.usages?.length && !expanded[String(clip.id)]" class="op-faint">{{ usage(clip) }}</small>
          </div>
          <div class="op-audio-clip__actions">
            <audio v-if="clip.audio_url" :src="clip.audio_url" controls preload="none" />
            <span v-else class="op-faint" style="font-size: 12px">URL indisponível</span>
            <div class="op-flex" style="justify-content: flex-end">
              <button type="button" class="op-link" :disabled="busy[String(clip.id)]" @click="refreshUrl(clip)">nova URL</button>
              <button type="button" class="op-link" :aria-expanded="Boolean(expanded[String(clip.id)])" @click="toggle(clip)">{{ expanded[String(clip.id)] ? 'Fechar' : 'Detalhes' }} <OrdoIcon :name="expanded[String(clip.id)] ? 'chevron-up' : 'chevron-down'" :size="14" /></button>
            </div>
          </div>
        </div>

        <div v-for="candidate in pending(clip)" :key="candidate.id" class="op-audio-candidate">
          <div>
            <strong>Nova tentativa</strong>
            <small>{{ formatDuration(candidate.duration) }} · {{ formatTimestamp(candidate.created_at) }}</small>
            <small v-if="candidate.custom_instructions">observação: {{ candidate.custom_instructions }}</small>
          </div>
          <div class="op-flex" style="justify-content: flex-end">
            <audio v-if="candidate.audio_url" :src="candidate.audio_url" controls preload="none" />
            <button type="button" class="op-btn op-btn--small op-btn--primary" :disabled="busy[candidateKey(clip, candidate)]" @click="accept(clip, candidate)">aprovar</button>
            <button type="button" class="op-btn op-btn--small op-btn--danger" :disabled="busy[candidateKey(clip, candidate)]" @click="reject(clip, candidate)">{{ busy[candidateKey(clip, candidate)] ? 'descartando…' : 'descartar' }}</button>
          </div>
        </div>

        <div v-if="expanded[String(clip.id)]" class="op-audio-clip__details">
          <dl class="op-kv" style="--op-kv-cols: 4">
            <div><dt>Voz</dt><dd class="op-mono" style="font-size: 13px">{{ clip.provider }} · {{ clip.voice }} · {{ clip.language }}</dd></div>
            <div><dt>Criado</dt><dd class="op-mono" style="font-size: 13px">{{ formatTimestamp(clip.created_at) }}</dd></div>
            <div><dt>Versão</dt><dd class="op-mono" style="font-size: 13px">{{ short(clip.configuration_fingerprint) }}</dd></div>
            <div><dt>Instruções</dt><dd class="op-mono" style="font-size: 13px">{{ short(clip.instructions_sha256) }}</dd></div>
          </dl>
          <div v-if="clip.usages?.length" class="op-flex" style="gap: 5px">
            <span v-for="item in clip.usages" :key="`${item.prayer_book_code}-${item.source_name}-${item.source_key}`" class="op-pill op-pill--quiet">{{ item.prayer_book_code }} / {{ item.source_name }}</span>
          </div>
          <label class="op-label">Observação específica deste áudio
            <textarea v-model="instructions[String(clip.id)]" class="op-field" maxlength="1000" rows="2" placeholder="Ex.: pronuncie “Efraim” com a tonicidade correta." />
            <small>Usada só neste texto e nas próximas gerações dele; não muda a voz dos outros textos.</small>
          </label>
          <div class="op-flex" style="justify-content: flex-end">
            <button type="button" class="op-btn op-btn--small" :disabled="busy[String(clip.id)]" @click="regenerate(clip)">{{ busy[String(clip.id)] ? 'Enviando…' : 'Gerar nova tentativa' }}</button>
          </div>
          <div v-if="reviewed(clip).length" style="display: grid; gap: 5px">
            <strong style="font-size: 12px">Tentativas anteriores</strong>
            <div v-for="candidate in reviewed(clip)" :key="candidate.id" class="op-flex" style="gap: 8px">
              <span class="op-pill" :class="`op-pill--${CANDIDATE[candidate.status || '']?.tone || 'quiet'}`">{{ CANDIDATE[candidate.status || '']?.label || candidate.status }}</span>
              <small class="op-faint">{{ formatDuration(candidate.duration) }} · {{ formatTimestamp(candidate.created_at) }}<template v-if="candidate.custom_instructions"> · observação: {{ candidate.custom_instructions }}</template></small>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="pagination.total" class="op-panel__foot">
      <span>Página {{ page }} de {{ pages }}</span>
      <div class="op-flex">
        <button type="button" class="op-btn op-btn--small" :disabled="page <= 1 || loading" @click="turn(-1)"><OrdoIcon name="chevron-left" :size="14" />Anterior</button>
        <button type="button" class="op-btn op-btn--small" :disabled="page >= pages || loading" @click="turn(1)">Próxima<OrdoIcon name="chevron-right" :size="14" /></button>
      </div>
    </div>
  </section>
</template>
