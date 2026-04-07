import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { F } from '../../theme/fonts';
import { FALLBACK_IMAGE } from '../../constants';

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const AVATAR_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
function avatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

// ── Gradient overlay (cross-platform) ────────────────────────────────────────

const gradientOverlayStyle: any =
  Platform.OS === 'web'
    ? { background: 'linear-gradient(to top, rgba(0,0,0,0.68) 0%, transparent 100%)' }
    : { backgroundColor: 'rgba(0,0,0,0.38)' };

// ── Reel item ─────────────────────────────────────────────────────────────────

interface ReelDoc {
  id: string;
  place_name: string;
  photo_urls: string[];
  cached_at: number;
}

function ReelItem({
  item,
  isLiked,
  onToggleLike,
}: {
  item: ReelDoc;
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const photoUrl = item.photo_urls?.[0] || FALLBACK_IMAGE;
  const initial = (item.place_name || '?')[0].toUpperCase();
  const bgColor = avatarColor(item.place_name || '?');

  return (
    <View style={styles.reelWrap}>
      {/* Thumbnail with green "unseen" border */}
      <View style={styles.thumbnailBorder}>
        <ImageBackground
          source={{ uri: photoUrl }}
          style={styles.thumbnail}
          imageStyle={styles.thumbnailImg}
        >
          {/* Bottom gradient */}
          <View style={[styles.gradientOverlay, gradientOverlayStyle]} />

          {/* Play button — centered */}
          <View style={styles.playBtn} pointerEvents="none">
            <Ionicons name="play" size={10} color="#fff" />
          </View>

          {/* Place name — bottom left */}
          <Text style={styles.reelName} numberOfLines={2}>{item.place_name}</Text>

          {/* Heart — bottom right */}
          <TouchableOpacity style={styles.heartBtn} onPress={onToggleLike} activeOpacity={0.7}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={12}
              color={isLiked ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {/* Below-thumbnail meta */}
      <View style={styles.metaRow}>
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaName} numberOfLines={1}>{item.place_name}</Text>
          <Text style={styles.metaTime}>{relativeTime(item.cached_at)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AroundCampus() {
  const [reels, setReels] = useState<ReelDoc[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Try campus_spotlights (may not exist yet → returns empty)
      try {
        const q = query(
          collection(db, 'campus_spotlights'),
          where('campus_id', '==', 'berea'),
          where('active', '==', true),
          orderBy('display_order', 'asc'),
        );
        const snap = await getDocs(q);
        if (!cancelled && snap.size > 0) {
          setReels(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReelDoc)));
          return;
        }
      } catch {
        // Collection doesn't exist yet — fall through to place_details_cache
      }

      // 2. Fallback: first 8 seeded places ordered by cached_at desc
      if (cancelled) return;
      try {
        const q2 = query(
          collection(db, 'place_details_cache'),
          orderBy('cached_at', 'desc'),
          limit(8),
        );
        const snap2 = await getDocs(q2);
        if (!cancelled) {
          setReels(snap2.docs.map(d => ({ id: d.id, ...d.data() } as ReelDoc)));
        }
      } catch {
        // Firestore unavailable — show nothing
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const toggleLike = (id: string) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (reels.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Moments</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {reels.map(item => (
          <ReelItem
            key={item.id}
            item={item}
            isLiked={!!liked[item.id]}
            onToggleLike={() => toggleLike(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const THUMB_W = 102;
const THUMB_H = 144;

const styles = StyleSheet.create({
  wrapper: { marginTop: 18 },
  header: {
    fontSize: 16,
    fontFamily: F.bold,
    color: '#1A1A1A',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  reelWrap: {
    width: THUMB_W,
  },
  thumbnailBorder: {
    borderWidth: 2.5,
    borderColor: '#10B981',
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumbnail: {
    width: THUMB_W - 5,   // account for border
    height: THUMB_H - 5,
    justifyContent: 'flex-end',
  },
  thumbnailImg: {
    borderRadius: 11,
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    borderRadius: 11,
  },
  playBtn: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // circle background
    ...(Platform.OS !== 'web' ? {} : {}),
  },
  reelName: {
    position: 'absolute',
    bottom: 22,
    left: 6,
    right: 24,
    fontSize: 10,
    fontFamily: F.semibold,
    color: '#fff',
    lineHeight: 13,
  },
  heartBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 9,
    fontFamily: F.bold,
    color: '#fff',
  },
  metaName: {
    fontSize: 10,
    fontFamily: F.semibold,
    color: '#1A1A1A',
  },
  metaTime: {
    fontSize: 9,
    fontFamily: F.regular,
    color: '#9CA3AF',
  },
});
