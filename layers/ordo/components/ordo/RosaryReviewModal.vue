<script setup lang="ts">
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import {
  isValidRosaryCategorySelection,
  type CustomRosaryPrayer,
  type CustomRosaryShareStatus,
  type RosaryCategory,
  type RosaryCategorySelection
} from '../../types/dashboard'

const props = defineProps<{
  rosary: CustomRosaryPrayer
  loading: boolean
  actionLoading: boolean
  actionError?: string | null
  categories: RosaryCategory[]
  categoriesLoading: boolean
  categoriesError?: string | null
  categorySelection: RosaryCategorySelection | null
  strapiSlug: string
  rejectionReason: string
}>()

const emit = defineEmits<{
  close: []
  'update:categorySelection': [value: RosaryCategorySelection | null]
  'update:strapiSlug': [value: string]
  'update:rejectionReason': [value: string]
  approve: []
  reject: []
}>()

const { humanizeKey } = useOrdoDashboardPresentation()
const statusLabel = (status?: CustomRosaryShareStatus) => status ? humanizeKey(status) : 'Sem status'
const statusClass = (status?: CustomRosaryShareStatus) => `is-${status || 'unknown'}`
const translationStatus = (rosary: CustomRosaryPrayer) => {
  if (rosary.translation_status) return humanizeKey(rosary.translation_status)

  return (rosary.translations || [])
    .filter(translation => translation.status)
    .map(translation => `${translation.locale ? `${translation.locale}: ` : ''}${humanizeKey(translation.status || '')}`)
    .join(' · ')
}

type CategoryMode = 'existing' | 'new'

const categoryMode = ref<CategoryMode>('existing')
const selectedCategoryKey = ref('')
const newCategory = reactive({
  slug: '',
  name: '',
  description: '',
  icon: ''
})

const categoryKey = (category: RosaryCategory) => category.documentId || category.slug

const categorySelection = computed<RosaryCategorySelection | null>(() => {
  if (categoryMode.value === 'existing') {
    const category = props.categories.find(item => categoryKey(item) === selectedCategoryKey.value)
    if (!category) return null

    return {
      mode: 'existing',
      slug: category.slug,
      ...(category.documentId ? { documentId: category.documentId } : {})
    }
  }

  return { mode: 'new', ...newCategory }
})

const isCategoryValid = computed(() => isValidRosaryCategorySelection(categorySelection.value))
const selectedCategory = computed(() => props.categories.find(category => categoryKey(category) === selectedCategoryKey.value))

const syncCategorySelection = () => {
  emit('update:categorySelection', categorySelection.value)
}

const onExistingCategoryChange = (event: Event) => {
  selectedCategoryKey.value = (event.target as HTMLSelectElement).value
  syncCategorySelection()
}

const onNewCategoryInput = (field: keyof typeof newCategory, event: Event) => {
  newCategory[field] = (event.target as HTMLInputElement | HTMLTextAreaElement).value
  syncCategorySelection()
}

const onReasonInput = (event: Event) => emit('update:rejectionReason', (event.target as HTMLTextAreaElement).value)
const onSlugInput = (event: Event) => emit('update:strapiSlug', (event.target as HTMLInputElement).value)

watch(() => props.categorySelection, (selection) => {
  if (!selection) {
    categoryMode.value = 'existing'
    selectedCategoryKey.value = ''
    Object.assign(newCategory, { slug: '', name: '', description: '', icon: '' })
    return
  }

  categoryMode.value = selection.mode
  if (selection.mode === 'existing') {
    selectedCategoryKey.value = selection.documentId || selection.slug
    return
  }

  Object.assign(newCategory, selection)
}, { immediate: true })
</script>

<template>
  <div class="ordo-modal-backdrop" @click.self="emit('close')">
    <section class="ordo-modal" role="dialog" aria-modal="true" aria-labelledby="rosary-modal-title">
      <div class="ordo-modal__header"><div><p class="ordo-kicker">Revisão editorial</p><h2 id="rosary-modal-title">{{ rosary.title }}</h2><span>{{ rosary.author?.name || 'Autor não informado' }} · {{ rosary.locale || 'locale não informado' }}</span></div><button type="button" class="ordo-modal__close" aria-label="Fechar revisão" @click="emit('close')">×</button></div>
      <div v-if="loading" class="ordo-queue-loading">Carregando sequência expandida…</div>
      <template v-else>
        <div class="ordo-modal__facts">
          <span :class="['ordo-status', statusClass(rosary.share_status)]">{{ statusLabel(rosary.share_status) }}</span>
          <span>{{ rosary.expanded_steps?.length || 0 }} passos expandidos</span>
          <span v-if="rosary.publication_status">Publicação: {{ humanizeKey(rosary.publication_status) }}</span>
          <span v-if="rosary.documentId">documentId: {{ rosary.documentId }}</span>
          <span v-if="rosary.translation_status || rosary.translations?.length">Tradução: {{ translationStatus(rosary) || '—' }}</span>
        </div>
        <p v-if="rosary.description" class="ordo-modal__description">{{ rosary.description }}</p>
        <div v-if="rosary.expanded_steps?.length" class="ordo-modal__sequence">
          <div v-for="step in rosary.expanded_steps" :key="`${step.position}-${step.title}`" class="ordo-modal__step">
            <span>{{ String(step.position || 0).padStart(2, '0') }}</span>
            <div>
              <strong>{{ step.display_title || step.title || 'Sem título' }}</strong>
              <small>{{ step.step_type || 'oração' }}</small>
              <p>{{ step.text || 'Sem texto' }}</p>
            </div>
          </div>
        </div>
        <div v-else class="ordo-empty-inline"><span class="ordo-empty-inline__mark">∅</span><span>Esta oração não possui passos expandidos.</span></div>

        <div class="ordo-modal__category">
          <div class="ordo-modal__category-heading">
            <div>
              <p class="ordo-kicker">Destino editorial</p>
              <h3>Escolha uma categoria</h3>
            </div>
            <span class="ordo-modal__required">Obrigatória para aprovar</span>
          </div>
          <p class="ordo-modal__category-help">A categoria organiza a oração publicada. Nenhuma categoria é escolhida automaticamente.</p>

          <div class="ordo-category-mode" role="radiogroup" aria-label="Modo de categoria">
            <label :class="{ 'is-active': categoryMode === 'existing' }">
              <input v-model="categoryMode" type="radio" value="existing" @change="syncCategorySelection">
              <span><strong>Usar existente</strong><small>Escolha uma categoria já cadastrada</small></span>
            </label>
            <label :class="{ 'is-active': categoryMode === 'new' }">
              <input v-model="categoryMode" type="radio" value="new" @change="syncCategorySelection">
              <span><strong>Criar nova</strong><small>Cadastre os dados nesta aprovação</small></span>
            </label>
          </div>

          <div v-if="categoryMode === 'existing'" class="ordo-modal__category-fields">
            <label>
              Categoria existente
              <select :value="selectedCategoryKey" :disabled="categoriesLoading" @change="onExistingCategoryChange">
                <option value="">{{ categoriesLoading ? 'Carregando categorias…' : 'Selecione uma categoria' }}</option>
                <option v-for="category in categories" :key="categoryKey(category)" :value="categoryKey(category)">
                  {{ category.icon ? `${category.icon} ` : '' }}{{ category.name }} · {{ category.slug }}
                </option>
              </select>
            </label>
            <div v-if="selectedCategory" class="ordo-category-preview">
              <span class="ordo-category-preview__icon">{{ selectedCategory.icon || '✦' }}</span>
              <div><strong>{{ selectedCategory.name }}</strong><small>{{ selectedCategory.description || selectedCategory.slug }}</small></div>
            </div>
            <p v-if="categoriesError" class="ordo-modal__category-error">Não foi possível carregar as categorias existentes. Rota esperada: <code>GET /api/v1/admin/rosary_categories</code>. Você ainda pode criar uma nova categoria.</p>
          </div>

          <div v-else class="ordo-modal__category-fields ordo-modal__category-fields--new">
            <label>Nome <input :value="newCategory.name" type="text" required placeholder="Ex.: Rosário pela criação" @input="onNewCategoryInput('name', $event)"></label>
            <label>Slug <input :value="newCategory.slug" type="text" required placeholder="rosario-pela-criacao" @input="onNewCategoryInput('slug', $event)"></label>
            <label class="ordo-modal__category-field-wide">Descrição <textarea :value="newCategory.description" rows="2" placeholder="Resumo curto para a organização editorial" @input="onNewCategoryInput('description', $event)" /></label>
            <label>Ícone <input :value="newCategory.icon" type="text" placeholder="✦ ou nome do ícone" @input="onNewCategoryInput('icon', $event)"></label>
          </div>
          <p v-if="!isCategoryValid" class="ordo-modal__category-error">Selecione uma categoria existente ou informe pelo menos nome e slug para criar uma nova.</p>
        </div>

        <div class="ordo-modal__form"><label>Slug no Strapi (opcional)<input :value="strapiSlug" type="text" placeholder="rosario-pela-familia" @input="onSlugInput" /></label><label>Nota de rejeição (opcional)<textarea :value="rejectionReason" rows="2" placeholder="Motivo para o autor ou para o histórico editorial" @input="onReasonInput" /></label></div>
        <div v-if="actionError" class="ordo-modal__error">{{ actionError }}</div>
        <div class="ordo-modal__actions">
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="actionLoading" @click="emit('reject')">Rejeitar</button>
          <button type="button" class="ordo-button ordo-button--primary" :disabled="actionLoading || !isCategoryValid" @click="emit('approve')">
            {{ actionLoading ? 'Salvando…' : 'Aprovar revisão' }} <span>↗</span>
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style>
.ordo-modal__category {
  margin: 18px 26px 0;
  padding: 16px;
  border: 1px solid #dfe8dc;
  border-radius: 15px;
  background: #f1f6ef;
}

.ordo-modal__category-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ordo-modal__category-heading h3 {
  margin: 4px 0 0;
  color: var(--moss-deep);
  font-family: 'Fraunces', Georgia, serif;
  font-size: 20px;
  font-weight: 600;
}

.ordo-modal__required {
  padding: 5px 8px;
  border: 1px solid #e6c895;
  border-radius: 99px;
  color: #9a6b32;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
}

.ordo-modal__category-help {
  margin: 7px 0 13px;
  color: #748274;
  font-size: 11px;
  line-height: 1.45;
}

.ordo-category-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ordo-category-mode label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border: 1px solid #dbe5d8;
  border-radius: 10px;
  background: #fbfdf9;
  cursor: pointer;
}

.ordo-category-mode label.is-active {
  border-color: #a8bea5;
  background: #e6efe3;
  box-shadow: inset 0 0 0 1px rgba(73, 100, 81, .12);
}

.ordo-category-mode input {
  margin-top: 2px;
  accent-color: var(--moss);
}

.ordo-category-mode strong,
.ordo-category-mode small,
.ordo-category-preview strong,
.ordo-category-preview small {
  display: block;
}

.ordo-category-mode strong {
  color: var(--ink);
  font-size: 11px;
}

.ordo-category-mode small {
  margin-top: 3px;
  color: #879589;
  font-size: 9px;
  line-height: 1.35;
}

.ordo-modal__category-fields {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.ordo-modal__category-fields--new {
  grid-template-columns: 1fr 1fr;
}

.ordo-modal__category-fields label {
  display: grid;
  gap: 5px;
  color: #718073;
  font-size: 10px;
  font-weight: 800;
}

.ordo-modal__category-fields input,
.ordo-modal__category-fields select,
.ordo-modal__category-fields textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 9px 10px;
  border: 1px solid #d5e0d2;
  border-radius: 9px;
  outline: 0;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 11px;
}

.ordo-modal__category-fields input:focus,
.ordo-modal__category-fields select:focus,
.ordo-modal__category-fields textarea:focus {
  border-color: #91aa8e;
  box-shadow: 0 0 0 3px rgba(95, 130, 92, .12);
}

.ordo-modal__category-field-wide {
  grid-column: 1 / -1;
}

.ordo-category-preview {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border: 1px dashed #c7d7c4;
  border-radius: 10px;
  background: rgba(255, 255, 255, .55);
}

.ordo-category-preview__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: #e2ecdf;
  color: var(--moss-deep);
  font-size: 14px;
}

.ordo-category-preview strong {
  color: var(--ink);
  font-size: 11px;
}

.ordo-category-preview small {
  margin-top: 2px;
  color: #879589;
  font-size: 9px;
}

.ordo-modal__category-error {
  margin: 8px 0 0;
  color: #a15f57;
  font-size: 10px;
  line-height: 1.4;
}

.ordo-modal__category-error code {
  padding: 1px 3px;
  border-radius: 4px;
  background: #f7e8e4;
  font-size: 9px;
}

@media (max-width: 720px) {
  .ordo-modal__category {
    margin-right: 17px;
    margin-left: 17px;
  }
}

@media (max-width: 500px) {
  .ordo-category-mode,
  .ordo-modal__category-fields--new {
    grid-template-columns: 1fr;
  }

  .ordo-modal__category-heading {
    display: block;
  }

  .ordo-modal__required {
    display: inline-block;
    margin-top: 8px;
  }
}
</style>
