<script setup lang="ts">
interface Props {
  title: string
  description?: string
  icon?: string
  iconColor?: string
  eyebrow?: string
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  icon: undefined,
  iconColor: 'blue',
  eyebrow: 'Leitura'
})
</script>

<template>
  <section class="ordo-chart-card">
    <div class="ordo-chart-card__header">
      <div class="ordo-chart-card__heading">
        <div v-if="icon" class="ordo-chart-card__icon" :class="`ordo-chart-card__icon--${iconColor}`" aria-hidden="true">
          {{ icon }}
        </div>
        <div>
          <p class="ordo-chart-card__eyebrow">{{ eyebrow }}</p>
          <h2 class="ordo-chart-card__title">{{ title }}</h2>
          <p v-if="description" class="ordo-chart-card__description">{{ description }}</p>
        </div>
      </div>
      <slot name="actions" />
    </div>
    <div class="ordo-chart-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.ordo-chart-card {
  overflow: hidden;
  border: 1px solid rgba(50, 73, 56, 0.12);
  border-radius: 22px;
  background: rgba(251, 252, 248, 0.88);
  box-shadow: 0 12px 32px rgba(38, 55, 44, 0.055);
}

.ordo-chart-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 12px;
}

.ordo-chart-card__heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.ordo-chart-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 12px;
  background: #e7f0e5;
  color: #4d7159;
  font-size: 17px;
}

.ordo-chart-card__icon--blue { background: #e4eff1; color: #457180; }
.ordo-chart-card__icon--green { background: #e7f0e5; color: #4d7159; }
.ordo-chart-card__icon--purple { background: #eee9f1; color: #6d5e78; }
.ordo-chart-card__icon--orange { background: #f6eadc; color: #af7147; }
.ordo-chart-card__icon--pink { background: #f5e5e6; color: #a65c64; }
.ordo-chart-card__icon--indigo { background: #e8ebf5; color: #58658a; }

.ordo-chart-card__eyebrow {
  margin: 0 0 4px;
  color: #8b968a;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.ordo-chart-card__title {
  margin: 0;
  color: #263a2b;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.05;
}

.ordo-chart-card__description {
  margin: 6px 0 0;
  color: #7d887d;
  font-size: 12px;
}

.ordo-chart-card__body {
  padding: 10px 22px 22px;
}

@media (max-width: 640px) {
  .ordo-chart-card { border-radius: 18px; }
  .ordo-chart-card__header { padding: 16px 16px 8px; }
  .ordo-chart-card__body { padding: 8px 16px 16px; }
  .ordo-chart-card__title { font-size: 19px; }
}
</style>
