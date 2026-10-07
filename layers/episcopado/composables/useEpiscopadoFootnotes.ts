import type { InjectionKey, Ref } from 'vue'
import type { Footnote } from '../lib/views'

const KEY: InjectionKey<Ref<Footnote[]>> = Symbol('episcopado-footnotes')

/** A ficha publica suas notas; `EpiscopadoCites` as lê para abrir o cartão da fonte ao clicar em [n]. */
export function provideEpiscopadoFootnotes(footnotes: Ref<Footnote[]>) {
  provide(KEY, footnotes)
}

export function useEpiscopadoFootnotes(): Ref<Footnote[]> {
  return inject(KEY, ref([]))
}

/** Qual cartão de fonte está aberto na página (só um por vez). */
export function useEpiscopadoOpenCite() {
  return useState<string | null>('episcopado-open-cite', () => null)
}
