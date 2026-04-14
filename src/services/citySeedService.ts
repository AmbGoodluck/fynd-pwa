/**
 * City Auto-Seed Service
 *
 * When a user opens Fynd from a new city, this service seeds place_details_cache
 * for that city in the background. Every subsequent user from that city gets
 * instant cached results with zero API cost.
 *
 * Architecture:
 *   - seeded_cities Firestore collection tracks seeding status
 *   - 20km proximity check prevents duplicate seeding for same city
 *   - 30-min timeout on stuck "seeding" docs allows retry
 *   - Max 60 places per city, 9 category queries
 *   - Always fire-and-forget — never blocks UI
 */

import { Platform } from 'react-native';
import {
  collection, doc, getDocs, setDoc, updateDoc, query, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchPlaceDetails } from './googlePlacesService';
import { generatePlaceDescription } from './openaiService';
import { readPlaceCache, writePlaceCache, upsertSearchedPlace } from './placeDetailsService';
import { fetchOSMPlaces, resolvePhoto, parseOSMHours, OSMPlace } from './freePlacesService';

// ── Constants ─────────────────────────────────────────────────────────────────

const SEED_RADIUS_KM = 30;
const MAX_PLACES = 60;
const BATCH_SIZE = 5;
const DELAY_BETWEEN_CATEGORIES_MS = 300;
const DELAY_BETWEEN_PLACES_MS = 200;
const SEEDING_TIMEOUT_MS = 30 * 60 * 1000; // 30 min — treat stuck docs as failed
const PROXIMITY_CHECK_KM = 20; // within 20km = same city

const WEB_PROXY = ((process.env.EXPO_PUBLIC_OPENAI_PROXY || '').replace(/\/$/, ''))
  || 'https://fynd-api.jallohosmanamadu311.workers.dev';

const SEED_CATEGORIES = [
  'restaurants',
  'cafes coffee shops',
  'bars nightlife',
  'parks scenic viewpoints',
  'museums attractions',
  'libraries study spots',
  'shopping',
  'fast food',
  'outdoor activities hiking',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeededCity {
  city_name: string;
  lat: number;
  lng: number;
  radius_km: number;
  place_count: number;
  seeded_at: number;
  seeded_by: string;
  status: 'seeding' | 'complete' | 'failed';
  categories_completed: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Check if city is already seeded ──────────────────────────────────────────

async function findExistingCityDoc(lat: number, lng: number): Promise<{ id: string; data: SeededCity } | null> {
  try {
    const snap = await getDocs(collection(db, 'seeded_cities'));
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as SeededCity;
      const dist = haversineKm(lat, lng, data.lat, data.lng);
      if (dist <= PROXIMITY_CHECK_KM) {
        return { id: docSnap.id, data };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Process a single place ────────────────────────────────────────────────────

async function seedPlace(osmPlace: OSMPlace, cityName: string, userId: string): Promise<boolean> {
  try {
    const placeId = `osm_${osmPlace.osm_id}`;
    // Skip if already in cache
    const cached = await readPlaceCache(placeId);
    if (cached) return false; // already done
    
    // Check by name to avoid duplicate with Google
    const nameQuery = query(collection(db, 'place_details_cache'), where('place_name', '==', osmPlace.name));
    const nameSnap = await getDocs(nameQuery);
    if (!nameSnap.empty) return false;

    const photoUrls = await resolvePhoto(osmPlace.name, osmPlace.lat, osmPlace.lng, osmPlace.types);

    const details = {
      placeId,
      name: osmPlace.name,
      formattedAddress: osmPlace.address,
      city: osmPlace.city,
      phone: osmPlace.phone,
      website: osmPlace.website,
      rating: undefined,
      priceLevel: undefined,
      openingHours: parseOSMHours(osmPlace.opening_hours),
      photoUrls,
      photoRefs: [],
      types: osmPlace.types,
      lat: osmPlace.lat,
      lng: osmPlace.lng,
      editorialSummary: undefined,
      mapsUrl: `https://www.openstreetmap.org/node/${osmPlace.osm_id}`,
    };

    // Generate AI description
    const aiRes = await generatePlaceDescription(
      details.name,
      details.formattedAddress,
      details.city || cityName,
      details.types,
      details.rating,
      details.priceLevel,
    );

    const ai = aiRes || { description: details.editorialSummary || '', knownFor: [], vibe: '' };

    // Write to place_details_cache
    await writePlaceCache(placeId, details, ai);

    // Write to places collection
    await upsertSearchedPlace(placeId, details, cityName, userId);

    return true;
  } catch {
    return false;
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

let _seedingInProgress = false; // module-level guard — prevents double-trigger in same session

export async function checkAndSeedCity(
  cityName: string,
  lat: number,
  lng: number,
  userId: string,
): Promise<void> {
  // Basic validation
  if (!cityName || cityName === 'My Location' || !lat || !lng) return;
  // Don't double-trigger within the same app session
  if (_seedingInProgress) return;

  try {
    // Check Firestore for existing seeded_cities doc within 20km
    const existing = await findExistingCityDoc(lat, lng);

    if (existing) {
      const { data } = existing;
      // Already complete — nothing to do
      if (data.status === 'complete') return;
      // Another session is actively seeding — don't double up
      if (data.status === 'seeding') {
        const age = Date.now() - (data.seeded_at || 0);
        if (age < SEEDING_TIMEOUT_MS) return; // still fresh — let it finish
        // Timed out — fall through to retry
        console.log(`[CitySeeder] Seeding doc timed out for ${cityName}, retrying`);
      }
      // status === 'failed' or timed-out 'seeding' — update and retry
      await updateDoc(doc(db, 'seeded_cities', existing.id), {
        status: 'seeding',
        seeded_at: Date.now(),
        seeded_by: userId,
        categories_completed: [],
      });
      _seedingInProgress = true;
      runSeedingInBackground(existing.id, cityName, lat, lng, userId);
    } else {
      // Brand new city — create doc and start seeding
      const docId = `${cityName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      const cityDoc: SeededCity = {
        city_name: cityName,
        lat,
        lng,
        radius_km: SEED_RADIUS_KM,
        place_count: 0,
        seeded_at: Date.now(),
        seeded_by: userId,
        status: 'seeding',
        categories_completed: [],
      };
      await setDoc(doc(db, 'seeded_cities', docId), cityDoc);
      _seedingInProgress = true;
      runSeedingInBackground(docId, cityName, lat, lng, userId);
    }
  } catch (e) {
    console.warn('[CitySeeder] checkAndSeedCity error:', e);
  }
}

// ── Background seeding runner (never awaited by caller) ───────────────────────

async function runSeedingInBackground(
  docId: string,
  cityName: string,
  lat: number,
  lng: number,
  userId: string,
): Promise<void> {
  const cityDocRef = doc(db, 'seeded_cities', docId);
  let totalSeeded = 0;
  const categoriesCompleted: string[] = [];
  const seen = new Set<string>();

  // Collect all place IDs across all categories first
  const allPlaces: OSMPlace[] = [];
  const EXCLUDED_TYPES = new Set(['gas_station', 'convenience_store', 'atm', 'car_wash', 'car_repair', 'parking', 'storage', 'insurance_agency', 'real_estate_agency', 'funeral_home']);

  try {
    const osmPlaces = await fetchOSMPlaces(lat, lng, SEED_RADIUS_KM, cityName);
    const validPlaces = osmPlaces.filter(p => !p.types.some(t => EXCLUDED_TYPES.has(t)));
    allPlaces.push(...validPlaces);
    
    await updateDoc(cityDocRef, { categories_completed: SEED_CATEGORIES });

    // Sort alphabetically, cap at MAX_PLACES
    allPlaces.sort((a, b) => a.name.localeCompare(b.name));
    const toSeed = allPlaces.slice(0, MAX_PLACES);

    console.log(`[CitySeeder] ${cityName}: found ${allPlaces.length} unique places, seeding top ${toSeed.length}`);

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < toSeed.length; i += BATCH_SIZE) {
      const batch = toSeed.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(p => seedPlace(p, cityName, userId))
      );
      totalSeeded += results.filter(Boolean).length;
      await delay(DELAY_BETWEEN_PLACES_MS * BATCH_SIZE);
    }

    // Mark complete
    await updateDoc(cityDocRef, {
      status: 'complete',
      place_count: totalSeeded,
    });
    console.log(`[CitySeeder] ${cityName}: seeding complete — ${totalSeeded} places written`);
  } catch (e) {
    console.warn(`[CitySeeder] ${cityName}: seeding failed`, e);
    try {
      await updateDoc(cityDocRef, { status: 'failed' });
    } catch {}
  } finally {
    _seedingInProgress = false;
  }
}
