<script setup lang="ts">
interface Props {
  title: string
  value: string | number
  subtitle?: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo'
  icon?: string
  eyebrow?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  icon: undefined,
  eyebrow: undefined,
  color: 'blue'
})
</script>

<template>
  <article class="ordo-metric-card" :class="`ordo-metric-card--${color}`">
    <div class="ordo-metric-card__topline">
      <span class="ordo-metric-card__eyebrow">{{ eyebrow || 'Indicador' }}</span>
      <span v-if="icon" class="ordo-metric-card__icon" aria-hidden="true">{{ icon }}</span>
    </div>
    <p class="ordo-metric-card__title">{{ title }}</p>
    <p class="ordo-metric-card__value">{{ value }}</p>
    <p v-if="subtitle" class="ordo-metric-card__subtitle">{{ subtitle }}</p>
  </article>
</template>

<style scoped>
.ordo-metric-card {
  --metric-accent: #496451;
  --metric-tint: #eaf0e7;
  position: relative;
  min-height: 154px;
  overflow: hidden;
  padding: 18px 20px;
  border: 1px solid rgba(50, 73, 56, 0.13);
  border-radius: 20px;
  background: #fbfcf8;
  box-shadow: 0 10px 30px rgba(38, 55, 44, 0.07);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.ordo-metric-card::after {
  position: absolute;
  right: -30px;
  bottom: -42px;
  width: 120px;
  height: 120px;
  border: 18px solid var(--metric-tint);
  border-radius: 50%;
  content: '';
  opacity: 0.7;
}

.ordo-metric-card:hover {
  border-color: color-mix(in srgb, var(--metric-accent) 34%, transparent);
  box-shadow: 0 16px 34px rgba(38, 55, 44, 0.12);
  transform: translateY(-3px);
}

.ordo-metric-card--blue {
  --metric-accent: #457180;
  --metric-tint: #e4eff1;
}

.ordo-metric-card--green {
  --metric-accent: #4d7159;
  --metric-tint: #e7f0e5;
}

.ordo-metric-card--purple {
  --metric-accent: #6d5e78;
  --metric-tint: #eee9f1;
}

.ordo-metric-card--orange {
  --metric-accent: #af7147;
  --metric-tint: #f6eadc;
}

.ordo-metric-card--pink {
  --metric-accent: #a65c64;
  --metric-tint: #f5e5e6;
}

.ordo-metric-card--indigo {
  --metric-accent: #58658a;
  --metric-tint: #e8ebf5;
}

.ordo-metric-card__topline,
.ordo-metric-card__title,
.ordo-metric-card__value,
.ordo-metric-card__subtitle {
  position: relative;
  z-index: 1;
}

.ordo-metric-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ordo-metric-card__eyebrow {
  color: var(--metric-accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.ordo-metric-card__icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 10px;
  background: var(--metric-tint);
  color: var(--metric-accent);
  font-size: 16px;
}

.ordo-metric-card__title {
  margin: 18px 0 4px;
  color: #6e776c;
  font-size: 12px;
  font-weight: 600;
}

.ordo-metric-card__value {
  margin: 0;
  color: #233328;
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 0.95;
}

.ordo-metric-card__subtitle {
  max-width: 85%;
  margin: 10px 0 0;
  overflow: hidden;
  color: #879085;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .ordo-metric-card {
    min-height: 136px;
    padding: 15px;
    border-radius: 16px;
  }

  .ordo-metric-card__title {
    margin-top: 13px;
  }
}
</style>
