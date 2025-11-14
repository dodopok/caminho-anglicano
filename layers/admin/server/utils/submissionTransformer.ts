import type { Database } from '~/types/database'

type ChurchSubmission = Database['public']['Tables']['church_submissions']['Row']
type ChurchInsert = Database['public']['Tables']['churches']['Insert']

interface TransformOptions {
  geocodeResult: {
    latitude: number
    longitude: number
    city: string
    state: string
    postalCode: string
    formattedAddress: string
  }
  jurisdictionId: string
}

/**
 * Transform a church submission into the format needed for the churches table
 */
export async function transformSubmission(
  submission: ChurchSubmission,
  options: TransformOptions,
): Promise<ChurchInsert> {
  const { geocodeResult, jurisdictionId } = options

  // Parse pastors string into array
  const pastors = parsePastors(submission.pastors)

  // Parse schedules string into structured array
  const schedules = parseSchedules(submission.schedules)

  // Build social media object
  const socialMedia = {
    website: submission.website || null,
    instagram: submission.instagram || null,
    youtube: submission.youtube || null,
    spotify: submission.spotify || null,
  }

  // Create the church insert object
  const church: ChurchInsert = {
    name: submission.name,
    jurisdiction_id: jurisdictionId,
    address: submission.address,
    city: geocodeResult.city,
    state: geocodeResult.state,
    postal_code: geocodeResult.postalCode,
    latitude: geocodeResult.latitude,
    longitude: geocodeResult.longitude,
    schedules,
    description: submission.description || null,
    pastors,
    responsible_email: submission.responsible_email,
    social_media: socialMedia,
  }

  return church
}

/**
 * Parse pastors string into array
 * Handles: "Rev. John Doe", "Rev. John, Rev. Jane", "John Doe, Jane Smith"
 */
function parsePastors(pastorsString: string | null): string[] {
  if (!pastorsString) {
    return []
  }

  // Split by comma, semicolon, or "and"
  const pastors = pastorsString
    .split(/[,;]|\se\s|\sand\s/i)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  return pastors
}

/**
 * Parse schedules string into structured array
 * Expected format examples:
 * - "Domingos às 10h"
 * - "Domingos 10h, Quartas 19h30"
 * - "Sunday 10am, Wednesday 7pm"
 */
function parseSchedules(schedulesString: string | null): any[] {
  if (!schedulesString) {
    return []
  }

  // Split by comma, semicolon, or line break (handles both \n and \r\n)
  const schedules = schedulesString
    .split(/[,;]|[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      // Try to parse "Day time" format (e.g., "Domingos às 10h", "Quartas 19h30")
      // Match: word(s) + (optional "às"/"at") + time
      const match = s.match(/^(.+?)(?:\s+às\s+|\s+at\s+|\s+)(.+)$/)
      
      if (match) {
        return {
          day: match[1].trim(),
          time: match[2].trim(),
        }
      }
      
      // If no pattern matches, store as description
      return { description: s }
    })

  return schedules
}

/**
 * Find jurisdiction ID by name
 */
export async function findJurisdictionId(jurisdictionName: string): Promise<string | null> {
  const config = useRuntimeConfig()
  const { createClient } = await import('@supabase/supabase-js')

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Try exact match first
    const { data, error } = await supabase
      .from('jurisdictions')
      .select('id')
      .ilike('name', jurisdictionName)
      .single()

    if (data && !error) {
      return data.id
    }

    // Try fuzzy match by slug
    const { data: allJurisdictions } = await supabase
      .from('jurisdictions')
      .select('id, name, slug')

    if (allJurisdictions) {
      // Check if matches slug
      const match = allJurisdictions.find(
        j => j.slug?.toLowerCase() === jurisdictionName.toLowerCase()
          || j.name?.toLowerCase().includes(jurisdictionName.toLowerCase()),
      )

      if (match) {
        return match.id
      }
    }

    return null
  }
  catch (error) {
    console.error('Error finding jurisdiction:', error)
    return null
  }
}
