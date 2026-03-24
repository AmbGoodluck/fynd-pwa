import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { formatRelativeDate } from '../utils/date';
import {
  getMoments,
  addMoment,
  deleteMoment,
  uploadMomentMedia,
  createMomentRecord,
} from '../services/momentService';
import type { TripMoment } from '../types/moment';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

type LocalMoment = TripMoment & { __uploading?: boolean };

const { width: SCREEN_W } = Dimensions.get('window');
// Full-bleed grid: 1px margin on each cell side = 2px between cells, 3 cells
const CELL_SIZE = Math.floor((SCREEN_W - 4) / 3);

// ── Grid item (memoized for performance) ─────────────────────────────────────
const GridItem = React.memo(function GridItem({
  moment,
  onPress,
}: {
  moment: LocalMoment;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[gi.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
        {moment.thumbnail_url ? (
          <Image source={{ uri: moment.thumbnail_url }} style={gi.img} />
        ) : (
          <View style={gi.imgPlaceholder} />
        )}
        {moment.media_type === 'video' && !moment.__uploading && (
          <View style={gi.videoIcon}>
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        )}
        {moment.__uploading && (
          <View style={gi.uploadOverlay}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ── Recent strip item ─────────────────────────────────────────────────────────
const RecentItem = React.memo(function RecentItem({
  moment,
  onPress,
}: {
  moment: LocalMoment;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={ri.wrap} activeOpacity={0.85}>
      <View style={ri.imgWrap}>
        {moment.thumbnail_url ? (
          <Image source={{ uri: moment.thumbnail_url }} style={ri.img} />
        ) : (
          <View style={[ri.img, ri.imgPlaceholder]} />
        )}
        {moment.media_type === 'video' && (
          <View style={ri.videoIcon}>
            <Ionicons name="play" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={ri.name} numberOfLines={1}>
        {moment.user_name.split(' ')[0]}
      </Text>
      <Text style={ri.time} numberOfLines={1}>
        {formatRelativeDate(moment.uploaded_at)}
      </Text>
    </TouchableOpacity>
  );
});

// ── Full-screen viewer ────────────────────────────────────────────────────────
function MomentViewer({
  moments,
  startIndex,
  effectiveUserId,
  onClose,
  onDelete,
}: {
  moments: LocalMoment[];
  startIndex: number;
  effectiveUserId: string;
  onClose: () => void;
  onDelete: (moment: LocalMoment) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const current = moments[index];
  if (!current) return null;

  const canDelete = current.user_id === effectiveUserId;
  const isVideo = current.media_type === 'video';
  const hasFullVideo =
    isVideo && !!current.media_url && current.media_url !== current.thumbnail_url;

  const download = () => {
    if (Platform.OS !== 'web') return;
    const a = document.createElement('a');
    a.href = current.media_url || current.thumbnail_url;
    a.download = `moment.${isVideo ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={vs.overlay}>
        {/* Header */}
        <View style={vs.header}>
          <TouchableOpacity
            onPress={onClose}
            style={vs.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={vs.counter}>
            {index + 1} / {moments.length}
          </Text>
          {canDelete ? (
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              style={vs.iconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View style={vs.iconBtn} />
          )}
        </View>

        {/* Media area */}
        <View style={vs.mediaArea}>
          {index > 0 && (
            <TouchableOpacity
              style={vs.arrowLeft}
              onPress={() => setIndex((i) => i - 1)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color="#fff" />
            </TouchableOpacity>
          )}

          {isVideo && hasFullVideo && Platform.OS === 'web' ? (
            React.createElement('video', {
              key: current.moment_id,
              src: current.media_url,
              controls: true,
              autoPlay: true,
              playsInline: true,
              style: {
                maxWidth: '90%',
                maxHeight: '65vh',
                borderRadius: 12,
                outline: 'none',
              } as any,
            })
          ) : isVideo ? (
            // Video stored as thumbnail-only (R2 not yet wired)
            <View style={vs.videoPreviewWrap}>
              <Image
                source={{ uri: current.thumbnail_url }}
                style={vs.videoPreviewImg}
                resizeMode="cover"
              />
              <View style={vs.videoPreviewBadge}>
                <Ionicons name="videocam-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={vs.videoPreviewText}>Full video coming soon</Text>
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: current.media_url || current.thumbnail_url }}
              style={vs.mediaImg}
              resizeMode="contain"
            />
          )}

          {index < moments.length - 1 && (
            <TouchableOpacity
              style={vs.arrowRight}
              onPress={() => setIndex((i) => i + 1)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-forward" size={30} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={vs.footer}>
          <View>
            <Text style={vs.uploaderName}>{current.user_name}</Text>
            <Text style={vs.uploadedAt}>
              {formatRelativeDate(current.uploaded_at)}
            </Text>
          </View>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={download} style={vs.downloadBtn}>
              <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={vs.downloadText}>Download</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <TouchableWithoutFeedback onPress={() => setShowDeleteConfirm(false)}>
            <View style={vs.confirmOverlay}>
              <TouchableWithoutFeedback>
                <View style={vs.confirmSheet}>
                  <View style={vs.confirmHandle} />
                  <View style={vs.confirmIconWrap}>
                    <Ionicons name="trash-outline" size={28} color="#EF4444" />
                  </View>
                  <Text style={vs.confirmTitle}>Delete this moment?</Text>
                  <Text style={vs.confirmBody}>This cannot be undone.</Text>
                  <TouchableOpacity
                    style={vs.confirmDeleteBtn}
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      onDelete(current);
                    }}
                  >
                    <Text style={vs.confirmDeleteText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={vs.confirmCancelBtn}
                    onPress={() => setShowDeleteConfirm(false)}
                  >
                    <Text style={vs.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>
    </Modal>
  );
}

// ── MomentsTab ────────────────────────────────────────────────────────────────
export default function MomentsTab({
  trip_id,
  effectiveUserId,
  effectiveUserName,
  isMember,
}: {
  trip_id: string;
  effectiveUserId: string;
  effectiveUserName: string;
  isMember: boolean;
}) {
  const [moments, setMoments] = useState<LocalMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchMomentsError, setFetchMomentsError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchMomentsError(null);
    getMoments(trip_id)
      .then(({ moments: fetched, lastDoc }) => {
        if (cancelled) return;
        setMoments(fetched);
        setCursor(lastDoc);
        setHasMore(!!lastDoc);
      })
      .catch(() => {
        if (!cancelled) setFetchMomentsError("Couldn't load moments. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trip_id]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const { moments: fetched, lastDoc } = await getMoments(trip_id, cursor);
      setMoments((prev) => [...prev, ...fetched]);
      setCursor(lastDoc);
      setHasMore(!!lastDoc);
    } catch {}
    finally { setLoadingMore(false); }
  }, [trip_id, cursor, hasMore, loadingMore]);

  // ── Upload (web only) ─────────────────────────────────────────────────────
  const pickAndUpload = () => {
    if (Platform.OS !== 'web') return;
    setUploadError(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file: File | undefined = e.target?.files?.[0];
      if (!file) return;

      const isVideoFile = file.type.startsWith('video/');
      const maxBytes = isVideoFile ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        setUploadError(`File too large. Max ${isVideoFile ? '50 MB' : '5 MB'}.`);
        return;
      }

      const mediaType: 'image' | 'video' = isVideoFile ? 'video' : 'image';
      const placeholderId = `__opt_${Date.now()}`;
      const placeholder: LocalMoment = {
        moment_id: placeholderId,
        trip_id,
        user_id: effectiveUserId,
        user_name: effectiveUserName,
        media_type: mediaType,
        thumbnail_url: '',
        media_url: '',
        uploaded_at: new Date().toISOString(),
        file_size: file.size,
        __uploading: true,
      };
      setMoments((prev) => [placeholder, ...prev]);
      setUploading(true);

      try {
        const { thumbnail_url, media_url } = await uploadMomentMedia(file, trip_id);
        const moment = createMomentRecord({
          trip_id,
          user_id: effectiveUserId,
          user_name: effectiveUserName,
          media_type: mediaType,
          thumbnail_url,
          media_url,
          file_size: file.size,
        });
        await addMoment(moment);
        setMoments((prev) =>
          prev.map((m) => (m.moment_id === placeholderId ? moment : m))
        );
      } catch {
        setMoments((prev) => prev.filter((m) => m.moment_id !== placeholderId));
        setUploadError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  // ── Delete (optimistic) ───────────────────────────────────────────────────
  const handleDelete = async (moment: LocalMoment) => {
    const idx = viewerIndex;
    setMoments((prev) => prev.filter((m) => m.moment_id !== moment.moment_id));
    // Close viewer or move to adjacent
    if (idx !== null) {
      setViewerIndex(null);
    }
    try {
      await deleteMoment(moment.moment_id);
    } catch {
      // Rollback: re-insert in sorted position
      setMoments((prev) =>
        [moment, ...prev].sort(
          (a, b) =>
            new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
      );
    }
  };

  const openViewer = (index: number) => {
    if (moments[index]?.__uploading) return;
    setViewerIndex(index);
  };

  // ── Non-member access denied ──────────────────────────────────────────────
  if (!isMember) {
    return (
      <View style={s.fill}>
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="lock-closed-outline" size={44} color="#9CA3AF" />
          </View>
          <Text style={s.emptyTitle}>Members only</Text>
          <Text style={s.emptyHint}>
            You don't have access to this trip's moments
          </Text>
        </View>
      </View>
    );
  }

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.fill}>
        <View style={s.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[gi.cell, gi.skeleton, { width: CELL_SIZE, height: CELL_SIZE }]}
            />
          ))}
        </View>
      </View>
    );
  }

  // ── Fetch error ───────────────────────────────────────────────────────────
  if (fetchMomentsError) {
    return (
      <View style={s.fill}>
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={44} color="#9CA3AF" />
          </View>
          <Text style={s.emptyTitle}>Couldn't load moments</Text>
          <Text style={s.emptyHint}>Check your connection and try again.</Text>
          <TouchableOpacity
            style={s.emptyAddBtn}
            onPress={() => {
              setFetchMomentsError(null);
              setLoading(true);
              getMoments(trip_id)
                .then(({ moments: fetched, lastDoc }) => {
                  setMoments(fetched);
                  setCursor(lastDoc);
                  setHasMore(!!lastDoc);
                  setFetchMomentsError(null);
                })
                .catch(() => setFetchMomentsError("Couldn't load moments. Please try again."))
                .finally(() => setLoading(false));
            }}
          >
            <Ionicons name="refresh-outline" size={16} color="#22C55E" style={{ marginRight: 4 }} />
            <Text style={s.emptyAddText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const recentMoments = moments.slice(0, 10);

  return (
    <View style={s.fill}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Moments</Text>
          {isMember && (
            <TouchableOpacity
              onPress={pickAndUpload}
              disabled={uploading}
              style={[s.addBtn, uploading && s.addBtnDisabled]}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={s.addBtnText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {uploadError && (
          <TouchableOpacity
            style={s.errorBanner}
            onPress={() => setUploadError(null)}
            activeOpacity={0.85}
          >
            <Ionicons name="warning-outline" size={14} color="#EF4444" />
            <Text style={s.errorText}>{uploadError}</Text>
            <Ionicons name="close" size={14} color="#EF4444" />
          </TouchableOpacity>
        )}

        {moments.length === 0 ? (
          /* Empty state */
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="camera-outline" size={44} color="#9CA3AF" />
            </View>
            <Text style={s.emptyTitle}>No moments yet</Text>
            <Text style={s.emptyHint}>
              Be the first to capture a memory from this trip
            </Text>
            {isMember && (
              <TouchableOpacity style={s.emptyAddBtn} onPress={pickAndUpload}>
                <Ionicons name="add-circle-outline" size={16} color="#22C55E" style={{ marginRight: 4 }} />
                <Text style={s.emptyAddText}>Add the first moment</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Recent strip */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Recent</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.recentStrip}
            >
              {recentMoments.map((m, i) => (
                <RecentItem
                  key={m.moment_id}
                  moment={m}
                  onPress={() => openViewer(i)}
                />
              ))}
            </ScrollView>

            {/* All label */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>All ({moments.length})</Text>
            </View>

            {/* Grid — full-bleed (no horizontal padding on ScrollView) */}
            <View style={s.grid}>
              {moments.map((m, i) => (
                <GridItem key={m.moment_id} moment={m} onPress={() => openViewer(i)} />
              ))}
            </View>

            {hasMore && (
              <TouchableOpacity
                style={s.loadMoreBtn}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#22C55E" />
                ) : (
                  <Text style={s.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {viewerIndex !== null && (
        <MomentViewer
          moments={moments}
          startIndex={viewerIndex}
          effectiveUserId={effectiveUserId}
          onClose={() => setViewerIndex(null)}
          onDelete={handleDelete}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F9FAFB' },
  // No horizontal padding on the ScrollView — grid needs full bleed.
  // Each section handles its own horizontal padding.
  scrollContent: { paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontFamily: F.bold, color: '#111827' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#22C55E',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#fff' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },

  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 24,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: F.semibold, color: '#374151', marginBottom: 6 },
  emptyHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyAddText: { fontSize: 14, fontFamily: F.semibold, color: '#22C55E' },

  sectionHeader: { paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  sectionLabel: { fontSize: 13, fontFamily: F.semibold, color: '#6B7280' },
  recentStrip: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },

  loadMoreBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  loadMoreText: { fontSize: 14, fontFamily: F.semibold, color: '#22C55E' },
});

// Grid item styles
const gi = StyleSheet.create({
  cell: {
    margin: 1,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, backgroundColor: '#E5E7EB' },
  videoIcon: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: { backgroundColor: '#E5E7EB' },
});

// Recent item styles
const ri = StyleSheet.create({
  wrap: { alignItems: 'center', width: 64 },
  imgWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 5,
    backgroundColor: '#E5E7EB',
  },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: '#E5E7EB' },
  videoIcon: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 11, color: '#6B7280', fontFamily: F.medium },
  time: { fontSize: 10, color: '#9CA3AF', fontFamily: F.regular },
});

// Viewer styles
const vs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { fontSize: 14, fontFamily: F.medium, color: 'rgba(255,255,255,0.7)' },

  mediaArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mediaImg: {
    width: SCREEN_W,
    height: SCREEN_W,
  },
  videoPreviewWrap: {
    width: SCREEN_W * 0.85,
    height: SCREEN_W * 0.7,
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoPreviewImg: { width: '100%', height: '100%' },
  videoPreviewBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  videoPreviewText: { fontSize: 13, color: '#fff', fontFamily: F.medium },

  arrowLeft: {
    position: 'absolute',
    left: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    zIndex: 2,
  },
  arrowRight: {
    position: 'absolute',
    right: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    zIndex: 2,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  uploaderName: { fontSize: 14, fontFamily: F.semibold, color: '#fff', marginBottom: 2 },
  uploadedAt: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  downloadText: { fontSize: 13, color: '#fff', fontFamily: F.medium },

  // Delete confirm sheet (shown on top of overlay)
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  confirmSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
    alignItems: 'center',
  },
  confirmHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 20,
  },
  confirmIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  confirmTitle: { fontSize: 20, fontFamily: F.bold, color: '#111827', marginBottom: 8, textAlign: 'center' },
  confirmBody: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  confirmDeleteBtn: {
    width: '100%', backgroundColor: '#EF4444', borderRadius: 14,
    height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  confirmDeleteText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
  confirmCancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  confirmCancelText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },
});
