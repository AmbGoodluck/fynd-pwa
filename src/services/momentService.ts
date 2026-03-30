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

const R2_WORKER_BASE = 'https://autumn-bush-9a08.jallohosmanamadu311.workers.dev';

export async function uploadMomentMedia(
  file: File,
  trip_id: string,
  _user_id?: string
): Promise<{ thumbnail_url: string; media_url: string }> {
  const isVideo = file.type.startsWith('video/');
  const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const baseKey = `${trip_id}/${Date.now()}`;
  const mediaKey = `${baseKey}.${ext}`;

  // Upload the full media file
  const uploadUrl = `${R2_WORKER_BASE}/api/upload?key=${encodeURIComponent(mediaKey)}`;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error('Upload to R2 failed');
  const { key: returnedKey } = await res.json();
  const media_url = `${R2_WORKER_BASE}/api/file?key=${encodeURIComponent(returnedKey)}`;

  // Generate and upload a thumbnail for images; for video use same URL
  let thumbnail_url = media_url;
  if (!isVideo) {
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const thumbDataUrl = await resizeImage(dataUrl, 300, 0.75);
      const thumbBlob = await (await fetch(thumbDataUrl)).blob();
      const thumbKey = `${baseKey}_thumb.jpg`;
      const thumbRes = await fetch(
        `${R2_WORKER_BASE}/api/upload?key=${encodeURIComponent(thumbKey)}`,
        { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: thumbBlob }
      );
      if (thumbRes.ok) {
        const { key: tKey } = await thumbRes.json();
        thumbnail_url = `${R2_WORKER_BASE}/api/file?key=${encodeURIComponent(tKey)}`;
      }
    } catch {
      // thumbnail generation failed — fall back to full image URL
    }
  }

  return { thumbnail_url, media_url };
}
