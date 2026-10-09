import { createClient } from '@supabase/supabase-js'

/**
 * Igrejas do Localizador de uma jurisdição da rede, pelo `locator_slug` da ficha.
 * Só o necessário para um mapa: nome, cidade, estado e coordenadas.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  if (!/^[a-z0-9-]+$/.test(slug)) throw createError({ statusCode: 400, statusMessage: 'Slug inválido' })
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.supabaseServiceKey) return { slug, churches: [] }
  const supabase = createClient(config.public.supabaseUrl as string, config.supabaseServiceKey as string)
  const { data: jurisdiction, error: jError } = await supabase.from('jurisdictions').select('id, slug, name, color').eq('slug', slug).maybeSingle()
  if (jError) throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar a jurisdição' })
  if (!jurisdiction) return { slug, churches: [] }
  const { data, error } = await supabase
    .from('churches')
    .select('id, name, slug, city, state, latitude, longitude')
    .eq('jurisdiction_id', (jurisdiction as { id: string }).id)
    .order('name')
  if (error) throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar igrejas' })
  type Row = { id: string; name: string; slug: string | null; city: string | null; state: string | null; latitude: string | number | null; longitude: string | number | null }
  const churches = ((data ?? []) as Row[])
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, city: c.city, state: c.state, latitude: Number(c.latitude), longitude: Number(c.longitude) }))
    .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
  return { slug, name: (jurisdiction as { name: string }).name, color: (jurisdiction as { color: string | null }).color, churches }
})
