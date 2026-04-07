#!/usr/bin/env ts-node
/**
 * seed-places.ts
 *
 * Bulk-seeds Fynd's Firestore `place_details_cache` and `places` collections
 * for a given city, using the exact same data shapes the app reads.
 *
 * REQUIREMENTS
 *   - Node 18+  (uses native fetch)
 *   - scripts/service-account.json  OR  GOOGLE_APPLICATION_CREDENTIALS set
 *   - EXPO_PUBLIC_GOOGLE_PLACES_API_KEY  in project root .env
 *   - OPENAI_API_KEY  in project root .env  (add it — not present by default)
 *
 * USAGE
 *   npx ts-node --project scripts/tsconfig.json scripts/seed-places.ts \
 *     --lat 37.5687 --lng -84.2963 --city "Berea, KY" --radius 30
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import OpenAI from 'openai';
import { db } from './firebase-admin';

// Load .env from project root (scripts/ is one level below)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ── Config ────────────────────────────────────────────────────────────────────

const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  process.env.GOOGLE_PLACES_API_KEY ||
  '';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/** 7-day cache TTL — matches CACHE_TTL_MS in src/services/placeDetailsService.ts */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const GOOGLE_BASE = 'https://maps.googleapis.com/maps/api/place';
const PHOTOS_DIR = path.join(__dirname, 'photos');
const RESULTS_FILE = path.join(__dirname, 'seeded-places.json');

// ── Interfaces (mirror app data shapes exactly) ───────────────────────────────
// Copied from src/services/googlePlacesService.ts — do NOT import it directly
// because it imports React Native's Platform module.

interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  city: string;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
  openingHours?: { openNow?: boolean; weekdayText?: string[] };
  photoUrls: string[];
  photoRefs: string[];
  types: string[];
  lat: number;
  lng: number;
  editorialSummary?: string;
  mapsUrl?: string;
}

interface AiResult {
  description: string;
  knownFor: string[];
  vibe: string;
}

interface SeedStats {
  totalFound: number;
  totalUnique: number;
  newlyCached: number;
  skipped: number;
  errors: number;
  googleTextSearchCalls: number;
  googleDetailCalls: number;
  photosDownloaded: number;
  openAiCalls: number;
}

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(): { lat: number; lng: number; city: string; radius: number } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const lat = parseFloat(get('--lat') || '');
  const lng = parseFloat(get('--lng') || '');
  const city = get('--city') || '';
  const radius = parseFloat(get('--radius') || '30');

  if (isNaN(lat) || isNaN(lng) || !city) {
    console.error(
      'Usage: npx ts-node --project scripts/tsconfig.json scripts/seed-places.ts \\\n' +
      '  --lat <lat> --lng <lng> --city "<city>" [--radius <km>]\n\n' +
      'Example (Berea, KY):\n' +
      '  npx ts-node --project scripts/tsconfig.json scripts/seed-places.ts \\\n' +
      '    --lat 37.5687 --lng -84.2963 --city "Berea, KY" --radius 30',
    );
    process.exit(1);
  }
  return { lat, lng, city, radius };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Direct Google Places photo URL — matches getPhotoUrl() for native in googlePlacesService.ts */
function buildPhotoUrl(ref: string, maxWidth = 800): string {
  return `${GOOGLE_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_API_KEY}`;
}

// ── Google Places: Text Search (with pagination) ──────────────────────────────

async function textSearch(
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  stats: SeedStats,
): Promise<any[]> {
  const results: any[] = [];
  let nextPageToken: string | null = null;
  let page = 0;

  do {
    let url: string;
    if (nextPageToken) {
      // Google requires ~2 s before a page token becomes valid
      await sleep(2000);
      url = `${GOOGLE_BASE}/textsearch/json?pagetoken=${encodeURIComponent(nextPageToken)}&key=${GOOGLE_API_KEY}`;
    } else {
      url =
        `${GOOGLE_BASE}/textsearch/json` +
        `?query=${encodeURIComponent(query)}` +
        `&location=${lat},${lng}` +
        `&radius=${radiusMeters}` +
        `&key=${GOOGLE_API_KEY}`;
    }

    const res = await fetch(url);
    stats.googleTextSearchCalls++;
    const data = await res.json() as any;

    if (data.status === 'OK' && Array.isArray(data.results)) {
      results.push(...data.results);
      nextPageToken = data.next_page_token ?? null;
    } else {
      if (data.status && data.status !== 'ZERO_RESULTS') {
        process.stdout.write(` [API ${data.status}] `);
      }
      break;
    }

    page++;
  } while (nextPageToken && page < 3); // max 60 results per query

  return results;
}

// ── Google Places: Details ────────────────────────────────────────────────────
// Replicates fetchPlaceDetails() from googlePlacesService.ts (native path).

async function fetchDetails(placeId: string, stats: SeedStats): Promise<PlaceDetails | null> {
  const fields = [
    'name', 'formatted_address', 'geometry', 'opening_hours',
    'formatted_phone_number', 'website', 'rating', 'price_level',
    'photos', 'editorial_summary', 'types', 'business_status', 'url',
    'address_components',
  ].join(',');

  const url =
    `${GOOGLE_BASE}/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=${encodeURIComponent(fields)}` +
    `&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    stats.googleDetailCalls++;
    const data = await res.json() as any;

    if (data.status !== 'OK' || !data.result) return null;

    const r = data.result;
    const refs: string[] = (r.photos || [])
      .slice(0, 5)
      .map((p: any) => p.photo_reference as string)
      .filter(Boolean);
    const urls: string[] = refs.map(ref => buildPhotoUrl(ref, 800));

    // Extract city from address_components — same logic as app
    const comps: any[] = r.address_components || [];
    const localityComp = comps.find((c: any) => c.types.includes('locality'));
    const regionComp = comps.find((c: any) => c.types.includes('administrative_area_level_1'));
    const city =
      localityComp?.long_name ||
      regionComp?.long_name ||
      r.formatted_address?.split(',')[0] ||
      '';

    return {
      placeId,
      name: r.name || '',
      formattedAddress: r.formatted_address || '',
      city,
      phone: r.formatted_phone_number,
      website: r.website,
      rating: r.rating,
      priceLevel: r.price_level,
      openingHours: r.opening_hours
        ? { openNow: r.opening_hours.open_now, weekdayText: r.opening_hours.weekday_text }
        : undefined,
      photoUrls: urls,
      photoRefs: refs,
      types: r.types || [],
      lat: r.geometry?.location?.lat ?? 0,
      lng: r.geometry?.location?.lng ?? 0,
      editorialSummary: r.editorial_summary?.overview,
      mapsUrl: r.url,
    };
  } catch {
    return null;
  }
}

// ── OpenAI: place description ─────────────────────────────────────────────────
// Prompt and response format identical to generatePlaceDescription() in
// src/services/openaiService.ts — produces the same ai_description / known_for / vibe.

async function generateDescription(
  details: PlaceDetails,
  openai: OpenAI,
  stats: SeedStats,
): Promise<AiResult> {
  const fallback: AiResult = {
    description: details.editorialSummary || `A local spot in ${details.city}.`,
    knownFor: details.types.slice(0, 3).map(t => t.replace(/_/g, ' ')),
    vibe: 'local',
  };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            "You are a local guide writing for travellers discovering places. Write casual, opinionated, helpful " +
            "descriptions — like a friend who's been there recommending it. Never be generic. Be specific about " +
            "what makes this place worth visiting.\n\n" +
            "Return ONLY valid JSON with this exact structure:\n" +
            "{\n" +
            '  "description": "2-3 sentences. Casual, specific, opinionated. Mention what to order, when to go, or what the vibe is like.",\n' +
            '  "known_for": ["3-5 short phrases of what this place is best known for"],\n' +
            '  "vibe": "One word or short phrase: e.g. chill, date night, late-night energy, outdoor adventure"\n' +
            "}",
        },
        {
          role: 'user',
          content:
            `Place: ${details.name}\n` +
            `Address: ${details.formattedAddress}\n` +
            `City: ${details.city}\n` +
            `Type: ${details.types.join(', ') || 'unknown'}\n` +
            `Rating: ${details.rating ?? 'unknown'}/5\n` +
            `Price level: ${details.priceLevel ?? 'unknown'}`,
        },
      ],
    });

    stats.openAiCalls++;
    const raw = response.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      description: parsed.description || fallback.description,
      knownFor: Array.isArray(parsed.known_for) ? parsed.known_for : fallback.knownFor,
      vibe: parsed.vibe || fallback.vibe,
    };
  } catch {
    return fallback;
  }
}

// ── Firestore writes ──────────────────────────────────────────────────────────
// These replicate writePlaceCache() and upsertSearchedPlace() from
// src/services/placeDetailsService.ts using Firebase Admin SDK instead of
// the client SDK. Data shape must match PlaceDetailsCache exactly.

async function writeCache(placeId: string, details: PlaceDetails, ai: AiResult): Promise<void> {
  await db.collection('place_details_cache').doc(placeId).set({
    place_id: placeId,
    place_name: details.name,
    formatted_address: details.formattedAddress,
    city: details.city,
    phone: details.phone ?? null,
    website: details.website ?? null,
    rating: details.rating ?? null,
    price_level: details.priceLevel ?? null,
    opening_hours: details.openingHours
      ? {
          open_now: details.openingHours.openNow ?? null,
          weekday_text: details.openingHours.weekdayText ?? null,
        }
      : null,
    photo_urls: details.photoUrls,
    types: details.types,
    ai_description: ai.description,
    known_for: ai.knownFor,
    vibe: ai.vibe,
    cached_at: Date.now(),
    lat: details.lat,
    lng: details.lng,
    editorial_summary: details.editorialSummary ?? null,
    maps_url: details.mapsUrl ?? null,
  });
}

async function upsertPlace(placeId: string, details: PlaceDetails, city: string): Promise<void> {
  const ref = db.collection('places').doc(placeId);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    place_id: placeId,
    name: details.name,
    formatted_address: details.formattedAddress,
    lat: details.lat,
    lng: details.lng,
    types: details.types,
    rating: details.rating ?? null,
    price_level: details.priceLevel ?? null,
    photo_url: details.photoUrls[0] ?? null,
    city,
    source: 'seed_script',
    added_by: null,
    created_at: Date.now(),
  });
}

// ── Photo download ────────────────────────────────────────────────────────────

async function downloadPhoto(url: string, destPath: string, stats: SeedStats): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buf));
    stats.photosDownloaded++;
  } catch {
    // Non-fatal — photo is not required for the seed to succeed
  }
}

// ── Category queries ──────────────────────────────────────────────────────────

function buildQueries(city: string): string[] {
  return [
    `restaurants in ${city}`,
    `cafes coffee shops in ${city}`,
    `bars nightlife in ${city}`,
    `parks scenic viewpoints in ${city}`,
    `museums attractions in ${city}`,
    `libraries study spots in ${city}`,
    `gyms fitness in ${city}`,
    `shopping in ${city}`,
    `fast food in ${city}`,
    `pizza in ${city}`,
    `ice cream desserts in ${city}`,
    `thrift stores in ${city}`,
    `outdoor activities hiking in ${city}`,
    `live music entertainment in ${city}`,
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { lat, lng, city, radius } = parseArgs();
  const radiusMeters = radius * 1000;

  if (!GOOGLE_API_KEY) {
    console.error(
      '[Error] Google Places API key not found.\n' +
      'Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY (or GOOGLE_PLACES_API_KEY) in .env',
    );
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error(
      '[Error] OpenAI API key not found.\n' +
      'Add OPENAI_API_KEY=sk-... to your .env file.',
    );
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  const stats: SeedStats = {
    totalFound: 0,
    totalUnique: 0,
    newlyCached: 0,
    skipped: 0,
    errors: 0,
    googleTextSearchCalls: 0,
    googleDetailCalls: 0,
    photosDownloaded: 0,
    openAiCalls: 0,
  };

  const queries = buildQueries(city);

  console.log('\nFynd Place Seeder');
  console.log('─'.repeat(60));
  console.log(`City    : ${city}`);
  console.log(`Center  : ${lat}, ${lng}`);
  console.log(`Radius  : ${radius} km`);
  console.log(`Queries : ${queries.length}`);
  console.log('─'.repeat(60));
  console.log('Phase 1 — Collecting place IDs...\n');

  // ── Phase 1: collect all place IDs across all category queries ──────────────

  const seen = new Set<string>();
  const basicData = new Map<string, any>(); // placeId → raw Google result

  for (let qi = 0; qi < queries.length; qi++) {
    const query = queries[qi];
    process.stdout.write(`  [${qi + 1}/${queries.length}] ${query}... `);

    const results = await textSearch(query, lat, lng, radiusMeters, stats);
    stats.totalFound += results.length;

    let newInQuery = 0;
    for (const r of results) {
      if (!r.place_id) continue;
      // Enforce radius — text search uses location as a bias, not a strict filter
      if (r.geometry?.location) {
        const dist = haversineKm(lat, lng, r.geometry.location.lat, r.geometry.location.lng);
        if (dist > radius) continue;
      }
      if (!seen.has(r.place_id)) {
        seen.add(r.place_id);
        basicData.set(r.place_id, r);
        newInQuery++;
      }
    }

    console.log(`${results.length} results, ${newInQuery} new unique`);
    await sleep(200); // 200 ms between search calls
  }

  stats.totalUnique = seen.size;

  console.log(`\nFound ${stats.totalUnique} unique places within ${radius} km`);
  console.log('─'.repeat(60));
  console.log('Phase 2 — Fetching details + AI descriptions...\n');

  // ── Phase 2: process each unique place ─────────────────────────────────────

  const placeIds = Array.from(seen);
  const seededPlaces: object[] = [];
  let processed = 0;

  for (const placeId of placeIds) {
    processed++;
    const basic = basicData.get(placeId);
    const shortName = (basic?.name || placeId).substring(0, 42);

    process.stdout.write(`  [${processed}/${placeIds.length}] ${shortName}... `);

    // Check Firestore cache — skip if fresh
    try {
      const snap = await db.collection('place_details_cache').doc(placeId).get();
      if (snap.exists) {
        const cached = snap.data() as any;
        if (typeof cached?.cached_at === 'number' && Date.now() - cached.cached_at < CACHE_TTL_MS) {
          stats.skipped++;
          console.log('✓ already cached');
          seededPlaces.push({ placeId, name: basic?.name, status: 'skipped' });
          continue;
        }
      }
    } catch {
      // Cache read failed — proceed with full fetch
    }

    // Fetch full Google Places details (200 ms delay between calls)
    await sleep(200);
    const details = await fetchDetails(placeId, stats);
    if (!details) {
      stats.errors++;
      console.log('✗ details fetch failed');
      seededPlaces.push({ placeId, name: basic?.name, status: 'error' });
      continue;
    }

    // Generate AI description (300 ms delay between OpenAI calls)
    await sleep(300);
    const ai = await generateDescription(details, openai, stats);

    // Write to Firestore
    try {
      await writeCache(placeId, details, ai);
      await upsertPlace(placeId, details, city);
      stats.newlyCached++;
    } catch (err: any) {
      stats.errors++;
      console.log(`✗ Firestore write failed: ${err?.message}`);
      seededPlaces.push({ placeId, name: details.name, status: 'error', error: err?.message });
      continue;
    }

    // Download primary photo to scripts/photos/{placeId}.jpg
    if (details.photoRefs[0]) {
      const photoPath = path.join(PHOTOS_DIR, `${placeId}.jpg`);
      await downloadPhoto(buildPhotoUrl(details.photoRefs[0], 800), photoPath, stats);
    }

    seededPlaces.push({
      placeId,
      name: details.name,
      city: details.city,
      address: details.formattedAddress,
      rating: details.rating,
      types: details.types.slice(0, 3),
      lat: details.lat,
      lng: details.lng,
      vibe: ai.vibe,
      knownFor: ai.knownFor,
      status: 'seeded',
    });

    console.log(`✓ seeded  [${ai.vibe}]`);
  }

  // ── Phase 3: write results file ─────────────────────────────────────────────

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(seededPlaces, null, 2));

  // ── Phase 4: summary ────────────────────────────────────────────────────────
  //
  // Cost estimates (Google Places Legacy API pricing, April 2025):
  //   Text Search:    $0.032 per request   (20 results per page, up to 3 pages)
  //   Place Details:  $0.017 per request   (all fields — name, contact, hours, photos)
  //   Place Photo:    $0.007 per request
  //   gpt-4o-mini:    ~$0.000135 per call  (~300 input + 150 output tokens)

  const googleSearchCost  = stats.googleTextSearchCalls * 0.032;
  const googleDetailCost  = stats.googleDetailCalls     * 0.017;
  const googlePhotoCost   = stats.photosDownloaded      * 0.007;
  const openAiCost        = stats.openAiCalls           * 0.000135;
  const totalCost         = googleSearchCost + googleDetailCost + googlePhotoCost + openAiCost;

  console.log('\n' + '═'.repeat(60));
  console.log('SEED COMPLETE');
  console.log('═'.repeat(60));
  console.log(`Total results (across all queries) : ${stats.totalFound}`);
  console.log(`Unique places within ${radius} km       : ${stats.totalUnique}`);
  console.log(`Newly cached                       : ${stats.newlyCached}`);
  console.log(`Skipped (already fresh in cache)   : ${stats.skipped}`);
  console.log(`Errors                             : ${stats.errors}`);
  console.log(`Photos downloaded                  : ${stats.photosDownloaded}`);
  console.log('');
  console.log('API CALLS & ESTIMATED COST');
  console.log(`  Google Text Search  : ${stats.googleTextSearchCalls.toString().padStart(4)} × $0.032  = $${googleSearchCost.toFixed(3)}`);
  console.log(`  Google Details      : ${stats.googleDetailCalls.toString().padStart(4)} × $0.017  = $${googleDetailCost.toFixed(3)}`);
  console.log(`  Google Photos       : ${stats.photosDownloaded.toString().padStart(4)} × $0.007  = $${googlePhotoCost.toFixed(3)}`);
  console.log(`  OpenAI gpt-4o-mini  : ${stats.openAiCalls.toString().padStart(4)} × $0.000135 = $${openAiCost.toFixed(4)}`);
  console.log(`  ${'─'.repeat(42)}`);
  console.log(`  TOTAL ESTIMATED     :                  $${totalCost.toFixed(3)}`);
  console.log('═'.repeat(60));
  console.log(`\nPhotos  : scripts/photos/ (${stats.photosDownloaded} files)`);
  console.log(`Results : scripts/seeded-places.json\n`);
}

main().catch(err => {
  console.error('\n[Fatal]', err?.message || err);
  process.exit(1);
});
