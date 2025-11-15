/**
 * Utility functions for generating URL-friendly slugs for churches
 */

/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to convert
 * @returns A URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Normalize to decomposed form for accent removal
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

/**
 * Generates a unique slug for a church based on name, city and state
 * Format: igreja-nome-cidade-estado
 * @param name - Church name
 * @param city - City name
 * @param state - State abbreviation
 * @returns A unique slug for the church
 */
export function generateChurchSlug(name: string, city: string, state: string): string {
  const namePart = slugify(name)
  const cityPart = slugify(city)
  const statePart = slugify(state)

  return `${namePart}-${cityPart}-${statePart}`
}

/**
 * Generates multiple slug variations for uniqueness checking
 * @param baseSlug - Base slug to generate variations from
 * @param counter - Number to append for uniqueness
 * @returns A slug with counter appended
 */
export function generateUniqueSlugVariation(baseSlug: string, counter: number): string {
  return `${baseSlug}-${counter}`
}
