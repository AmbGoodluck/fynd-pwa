import { Platform } from 'react-native';
import * as Sentry from './sentry';

const WEB_PROXY_FALLBACK = 'https://fynd-api.jallohosmanamadu311.workers.dev';
const OPENAI_PROXY = (process.env.EXPO_PUBLIC_OPENAI_PROXY || '').replace(/\/$/, '') || WEB_PROXY_FALLBACK;

export interface TripInput {
  destination: string;
  vibes: string[];
  places: { name: string; description?: string; address?: string }[];
  explorationHours: number;
  timeOfDay: string;
  accommodation?: string;
}

export interface ItineraryStop {
  placeId: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  order: number;
  tips?: string;
}

export async function generateItinerary(input: TripInput): Promise<ItineraryStop[]> {
  const placeNames = input.places.map(p => p.name).join(', ');
  const prompt = `You are a world-class travel curator. Create a personalized itinerary.

Destination: ${input.destination}
Vibes: ${input.vibes.join(', ')}
Places to include: ${placeNames}
Exploration time: ${input.explorationHours} hours
Time of day: ${input.timeOfDay}
Accommodation: ${input.accommodation || 'not specified'}

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "placeId": "place_name_slug",
    "name": "Place Name",
    "description": "2 sentence vibe-aware description of this place.",
    "estimatedMinutes": 45,
    "order": 1,
    "tips": "One practical insider tip."
  }
]

Include all ${input.places.length} places. Total time should fit within ${input.explorationHours} hours.`;

  const payload = {
    model: 'gpt-4o',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  };

  const target = `${OPENAI_PROXY}/api/chat`;
  const headers: any = { 'Content-Type': 'application/json' };

  Sentry.addBreadcrumb({ category: 'openai', message: `generateItinerary → ${target}`, level: 'info', data: { platform: Platform.OS, destination: input.destination } });

  // Add timeout so the call doesn't hang forever
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(target, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
  } catch (fetchErr: any) {
    clearTimeout(timeout);
    const isAbort = fetchErr?.name === 'AbortError';
    Sentry.captureException(fetchErr, {
      tags: { context: 'generateItinerary.fetch', platform: Platform.OS },
      extra: { target, timedOut: isAbort },
    });
    throw new Error(isAbort ? 'OpenAI request timed out after 30s' : `OpenAI fetch failed: ${fetchErr?.message}`);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    Sentry.captureMessage(`OpenAI generateItinerary HTTP ${response.status}`, {
      level: 'error',
      extra: { status: response.status, body: errBody.slice(0, 500), target, platform: Platform.OS },
    });
    throw new Error(`OpenAI error: ${response.status}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (parseErr) {
    Sentry.captureMessage('OpenAI itinerary JSON parse failed', {
      level: 'error',
      extra: { raw: clean.slice(0, 500) },
    });
    throw parseErr;
  }
}

export interface PlaceDescriptionResult {
  description: string;
  knownFor: string[];
  vibe: string;
}

/**
 * Generate an AI-powered place description, known-for tags, and vibe label.
 * Uses the existing Cloudflare Worker proxy so the OpenAI key stays server-side.
 * Returns null on failure — callers should fall back to the Google editorial summary.
 */
export async function generatePlaceDescription(
  placeName: string,
  address: string,
  city: string,
  types: string[],
  rating?: number,
  priceLevel?: number,
): Promise<PlaceDescriptionResult | null> {
  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `You are a local guide writing for travellers discovering places. Write casual, opinionated, helpful descriptions — like a friend who's been there recommending it. Never be generic. Be specific about what makes this place worth visiting.\n\nReturn ONLY valid JSON with this exact structure:\n{\n  "description": "2-3 sentences. Casual, specific, opinionated. Mention what to order, when to go, or what the vibe is like.",\n  "known_for": ["3-5 short phrases of what this place is best known for"],\n  "vibe": "One word or short phrase: e.g. chill, date night, late-night energy, outdoor adventure"\n}`,
      },
      {
        role: 'user',
        content: `Place: ${placeName}\nAddress: ${address}\nCity: ${city}\nType: ${types.join(', ') || 'unknown'}\nRating: ${rating ?? 'unknown'}/5\nPrice level: ${priceLevel ?? 'unknown'}`,
      },
    ],
  };

  const target = `${OPENAI_PROXY}/api/chat`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      description: parsed.description || '',
      knownFor: Array.isArray(parsed.known_for) ? parsed.known_for : [],
      vibe: parsed.vibe || '',
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export async function enhancePlaceDescription(placeName: string, vibes: string[], destination: string): Promise<string> {
  const prompt = `Write a 2-sentence vibe-aware description of "${placeName}" in ${destination} for a traveler interested in: ${vibes.join(', ')}. Be specific and evocative. Return only the description, no quotes.`;

  const payload = {
    model: 'gpt-4o',
    max_tokens: 150,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }],
  };
  const target = `${OPENAI_PROXY}/api/chat`;
  const headers: any = { 'Content-Type': 'application/json' };

  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), 20000);
  try {
    const response = await fetch(target, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller2.signal });
    clearTimeout(timeout2);
    if (!response.ok) return `A must-visit spot in ${destination}.`;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || `A must-visit spot in ${destination}.`;
  } catch (e) {
    clearTimeout(timeout2);
    return `A must-visit spot in ${destination}.`;
  }
}
