import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  startAfter,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TripMoment } from '../types/moment';

const MEDIA_COL = 'trip_media';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Fetch moments for a trip (cursor-based pagination) ────────────────────────
export async function getMoments(
  trip_id: string,
  cursor?: QueryDocumentSnapshot | null,
  pageLimit = 20
): Promise<{ moments: TripMoment[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [
    where('trip_id', '==', trip_id),
    orderBy('uploaded_at', 'desc'),
    fsLimit(pageLimit),
  ];
  if (cursor) constraints.push(startAfter(cursor));
  const q = query(collection(db, MEDIA_COL), ...constraints);
  const snap = await getDocs(q);
  return {
    moments: snap.docs.map((d) => d.data() as TripMoment),
    lastDoc: snap.docs.length === pageLimit ? snap.docs[snap.docs.length - 1] : null,
  };
}

// ── Write a moment record ─────────────────────────────────────────────────────
export async function addMoment(moment: TripMoment): Promise<void> {
  await setDoc(doc(db, MEDIA_COL, moment.moment_id), moment);
}

// ── Delete a moment record (caller must have checked ownership) ───────────────
export async function deleteMoment(moment_id: string): Promise<void> {
  await deleteDoc(doc(db, MEDIA_COL, moment_id));
}

// ── Build a TripMoment object (UUID + timestamp) ──────────────────────────────
export function createMomentRecord(params: {
  trip_id: string;
  user_id: string;
  user_name: string;
  media_type: 'image' | 'video';
  thumbnail_url: string;
  media_url: string;
  file_size: number;
}): TripMoment {
  return {
    moment_id: uuid(),
    ...params,
    uploaded_at: new Date().toISOString(),
  };
}

// ── Media processing (web only) ───────────────────────────────────────────────

function resizeImage(dataUrl: string, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new (window as any).Image() as HTMLImageElement;
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function captureVideoFrame(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const onReady = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(300, video.videoWidth || 300);
      canvas.height = Math.round(
        ((video.videoHeight || 200) / (video.videoWidth || 300)) * canvas.width
      );
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
      video.removeEventListener('loadeddata', onReady);
    };
    video.addEventListener('loadeddata', onReady);
    video.onerror = () => resolve('');
    video.src = dataUrl;
    video.load();
  });
}

// ── Upload stub ───────────────────────────────────────────────────────────────
// TODO: Replace with Cloudflare R2 Worker upload.
//   Worker endpoint: https://YOUR_WORKER.workers.dev/upload
//   POST body: { trip_id, user_id, file_name, file_type, data: base64 }
//   Expected response: { thumbnail_url: string, media_url: string }
//   Once R2 is wired, remove the inline base64 canvas approach below.
//
// Current fallback:
//   • Images  → compressed via canvas; thumbnail (max 300px) + full (max 1200px)
//               stored as base64 data URLs in Firestore. Stays within 1MB doc limit.
//   • Videos  → first-frame JPEG captured; full video cannot be stored in Firestore.
//               media_url == thumbnail_url until R2 upload is live.
export async function uploadMomentMedia(
  file: File,
  trip_id: string,
  user_id?: string
): Promise<{ thumbnail_url: string; media_url: string }> {
  // Read file as base64
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  // POST to Cloudflare Worker
  const res = await fetch('https://fynd-pwa.jallohosmanamadu311.workers.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trip_id,
      user_id: user_id || 'unknown',
      file_name: file.name,
      file_type: file.type,
      data: dataUrl,
    }),
  });
  if (!res.ok) throw new Error('Upload to R2 failed');
  const { thumbnail_url, media_url } = await res.json();
  return { thumbnail_url, media_url };
}
