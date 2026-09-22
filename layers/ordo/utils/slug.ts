// Slugs are typed by hand today, which is how a published rosary ends up under
// `rosario-pela-familia` one week and `Rosario_pela_Familia` the next. The
// title is the thing the editor already read, so it is what the suggestion is
// built from.
const COMBINING_MARKS = /[̀-ͯ]/g
const NON_SLUG = /[^a-z0-9]+/g
const EDGE_HYPHENS = /^-+|-+$/g

export const MAX_SLUG_LENGTH = 80

export const slugify = (value: string, maxLength = MAX_SLUG_LENGTH): string => {
  const ascii = (value || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_SLUG, '-')
    .replace(EDGE_HYPHENS, '')

  if (ascii.length <= maxLength) return ascii

  // Cut on a word boundary so the suggestion never ends mid-word.
  const clipped = ascii.slice(0, maxLength)
  const lastHyphen = clipped.lastIndexOf('-')
  return (lastHyphen > 0 ? clipped.slice(0, lastHyphen) : clipped).replace(EDGE_HYPHENS, '')
}
