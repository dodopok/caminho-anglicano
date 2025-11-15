#!/usr/bin/env tsx

/**
 * Script to generate slugs for existing churches in the database
 * Run with: npx tsx scripts/generate-church-slugs.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Load environment variables from .env file
config()

// Slugify function
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

function generateChurchSlug(name: string, city: string, state: string): string {
  const namePart = slugify(name)
  const cityPart = slugify(city)
  const statePart = slugify(state)
  return `${namePart}-${cityPart}-${statePart}`
}

async function main() {
  console.log('🚀 Starting slug generation for churches...\n')

  // Get environment variables (try both with and without NUXT_ prefix)
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.NUXT_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing environment variables')
    console.error('Please ensure NUXT_PUBLIC_SUPABASE_URL and NUXT_SUPABASE_SERVICE_KEY are set in .env')
    console.error('\nCurrent values:')
    console.error(`  NUXT_PUBLIC_SUPABASE_URL: ${supabaseUrl || 'not set'}`)
    console.error(`  NUXT_SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? 'set' : 'not set'}`)
    process.exit(1)
  }

  // Create Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

  try {
    // Fetch all churches
    console.log('📥 Fetching churches from database...')
    const { data: churches, error: fetchError } = await supabase
      .from('churches')
      .select('id, name, city, state, slug')
      .order('name')

    if (fetchError) {
      throw fetchError
    }

    if (!churches || churches.length === 0) {
      console.log('⚠️  No churches found in database')
      return
    }

    // Type assertion for TypeScript
    type ChurchRow = {
      id: string
      name: string
      city: string
      state: string
      slug: string | null
    }

    console.log(`✅ Found ${churches.length} churches\n`)

    // Track statistics
    let updated = 0
    let skipped = 0
    let errors = 0
    const slugsUsed = new Map<string, number>()

    // Process each church
    for (const church of churches as ChurchRow[]) {
      try {
        // Skip if already has slug
        if (church.slug) {
          console.log(`⏭️  Skipping "${church.name}" - already has slug: ${church.slug}`)
          skipped++
          continue
        }

        // Generate base slug
        let slug = generateChurchSlug(church.name, church.city, church.state)

        // Check if slug already used (handle duplicates)
        if (slugsUsed.has(slug)) {
          const count = slugsUsed.get(slug)! + 1
          slugsUsed.set(slug, count)
          slug = `${slug}-${count}`
          console.log(`⚠️  Duplicate slug detected, using: ${slug}`)
        } else {
          slugsUsed.set(slug, 0)
        }

        // Check if slug exists in database
        const { data: existing } = await supabase
          .from('churches')
          .select('id')
          .eq('slug', slug)
          .single()

        // If exists, append number
        if (existing) {
          let counter = 1
          let uniqueSlug = slug
          while (true) {
            uniqueSlug = `${slug}-${counter}`
            const { data: check } = await supabase
              .from('churches')
              .select('id')
              .eq('slug', uniqueSlug)
              .single()

            if (!check) {
              slug = uniqueSlug
              break
            }
            counter++
          }
        }

        // Update church with slug
        // @ts-expect-error - Type issue with Supabase update
        const { error: updateError } = await supabase
          .from('churches')
          .update({ slug })
          .eq('id', church.id)

        if (updateError) {
          throw updateError
        }

        console.log(`✅ Updated "${church.name}" with slug: ${slug}`)
        updated++
      } catch (err) {
        console.error(`❌ Error processing "${church.name}":`, err)
        errors++
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary:')
    console.log('='.repeat(50))
    console.log(`✅ Updated: ${updated}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📝 Total: ${churches.length}`)
    console.log('='.repeat(50) + '\n')

    if (errors === 0) {
      console.log('🎉 Slug generation completed successfully!')
    } else {
      console.log('⚠️  Slug generation completed with some errors')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main()
