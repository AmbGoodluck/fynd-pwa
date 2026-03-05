import * as Sentry from '@sentry/react-native';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_PROXY = process.env.EXPO_PUBLIC_OPENAI_PROXY || ''; // e.g. http://localhost:4000

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

  const target = OPENAI_PROXY ? `${OPENAI_PROXY.replace(/\/$/, '')}/api/chat` : 'https://api.openai.com/v1/chat/completions';
  const headers: any = { 'Content-Type': 'application/json' };
  if (!OPENAI_PROXY) headers['Authorization'] = `Bearer ${OPENAI_API_KEY}`;

  const response = await fetch(target, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    Sentry.captureMessage(`OpenAI generateItinerary HTTP ${response.status}`, {
      level: 'error',
      extra: { status: response.status, body: errBody, target },
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

export async function enhancePlaceDescription(placeName: string, vibes: string[], destination: string): Promise<string> {
  const prompt = `Write a 2-sentence vibe-aware description of "${placeName}" in ${destination} for a traveler interested in: ${vibes.join(', ')}. Be specific and evocative. Return only the description, no quotes.`;

  const payload = {
    model: 'gpt-4o',
    max_tokens: 150,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }],
  };
  const target = OPENAI_PROXY ? `${OPENAI_PROXY.replace(/\/$/, '')}/api/chat` : 'https://api.openai.com/v1/chat/completions';
  const headers: any = { 'Content-Type': 'application/json' };
  if (!OPENAI_PROXY) headers['Authorization'] = `Bearer ${OPENAI_API_KEY}`;

  const response = await fetch(target, { method: 'POST', headers, body: JSON.stringify(payload) });
  const data = await response.json();
  return data.choices?.[0]?.message?.content.trim();
}
