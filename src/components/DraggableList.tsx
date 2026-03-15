/**
 * DraggableList — smooth drag-and-drop list using core RN APIs only.
 *
 * Key design decisions that make dragging smooth:
 *  1. PanResponders are cached in a Map ref — the same object reference is
 *     returned on every render, so gesture handlers are never torn down
 *     mid-drag (which caused the old "shaky" behaviour).
 *  2. All gesture state that is read inside PanResponder callbacks is stored
 *     in refs, not state, so updates to those values never trigger re-renders
 *     during an active drag.
 *  3. Visual state (draggingIndex, targetIndex) is updated via state only
 *     when the value actually changes, minimising unnecessary re-renders.
 *  4. After a completed drag the PanResponder cache is cleared so the next
 *     render creates fresh handlers with the updated item order.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View, ScrollView, Animated, PanResponder,
  StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RenderFn<T> = (item: T, index: number, dragHandle: React.ReactElement) => React.ReactNode;

interface Props<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  itemHeight: number;
  renderItem: RenderFn<T>;
  onReorder: (newData: T[]) => void;
  contentContainerStyle?: object;
  style?: object;
}

export default function DraggableList<T>({
  data, keyExtractor, itemHeight, renderItem, onReorder, contentContainerStyle, style,
}: Props<T>) {
  // ── Visual state (drives renders) ────────────────────────────────────────
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetIndex,   setTargetIndex]   = useState<number | null>(null);
  const [liveData,      setLiveData]      = useState<T[]>(data);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // ── Refs (updated every render; safe to read inside callbacks) ───────────
  const liveDataRef    = useRef<T[]>(data);
  const onReorderRef   = useRef(onReorder);
  const targetIndexRef = useRef<number | null>(null);
  const isDragging     = useRef(false);
  const dragYAnim      = useRef(new Animated.Value(0)).current;

  // Keep mutable refs current on every render (no dependency arrays needed)
  liveDataRef.current  = liveData;
  onReorderRef.current = onReorder;

  // ── Sync liveData when parent data changes (not during drag) ─────────────
  React.useEffect(() => {
    if (!isDragging.current) {
      setLiveData(data);
      liveDataRef.current = data;
    }
  }, [data]);

  // ── PanResponder cache ────────────────────────────────────────────────────
  // Keyed by array index.  A cache hit returns the same object reference so
  // React never updates the View's event handlers during an active gesture.
  const prCache = useRef<Map<number, ReturnType<typeof PanResponder.create>>>(new Map());

  // Clear cache when list length changes (items added/removed)
  const prevLenRef = useRef(liveData.length);
  if (prevLenRef.current !== liveData.length) {
    prCache.current.clear();
    prevLenRef.current = liveData.length;
  }

  const getPanResponder = useCallback((index: number) => {
    const cached = prCache.current.get(index);
    if (cached) return cached;

    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 3,

      onPanResponderGrant: () => {
        isDragging.current = true;
        dragYAnim.setValue(0);
        targetIndexRef.current = index;
        setDraggingIndex(index);
        setTargetIndex(index);
        setScrollEnabled(false);
      },

      onPanResponderMove: (_, gs) => {
        dragYAnim.setValue(gs.dy);
        const rawTarget = index + Math.round(gs.dy / itemHeight);
        const clamped   = Math.max(0, Math.min(liveDataRef.current.length - 1, rawTarget));
        // Only setState when value changes to minimise re-renders during drag
        if (clamped !== targetIndexRef.current) {
          targetIndexRef.current = clamped;
          setTargetIndex(clamped);
        }
      },

      onPanResponderRelease: (_, gs) => {
        const rawTarget  = index + Math.round(gs.dy / itemHeight);
        const finalTarget = Math.max(0, Math.min(liveDataRef.current.length - 1, rawTarget));

        if (finalTarget !== index) {
          const reordered = [...liveDataRef.current];
          const [moved]   = reordered.splice(index, 1);
          reordered.splice(finalTarget, 0, moved);
          liveDataRef.current = reordered;
          setLiveData(reordered);
          onReorderRef.current(reordered);
        }

        resetDrag();
      },

      onPanResponderTerminate: () => {
        resetDrag();
      },
    });

    prCache.current.set(index, pr);
    return pr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemHeight]); // itemHeight is the only non-ref dependency

  const resetDrag = () => {
    isDragging.current     = false;
    targetIndexRef.current = null;
    dragYAnim.setValue(0);
    setDraggingIndex(null);
    setTargetIndex(null);
    setScrollEnabled(true);
    // Clear cache so the next render assigns fresh handlers in the new order
    prCache.current.clear();
  };

  return (
    <ScrollView
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      style={style}
    >
      {liveData.map((item, index) => {
        const key            = keyExtractor(item);
        const isBeingDragged = draggingIndex === index;
        const isDropTarget   = targetIndex === index &&
                               draggingIndex !== null &&
                               draggingIndex !== index;

        const pr = getPanResponder(index);

        const dragHandle = (
          <View style={styles.handleWrap} {...pr.panHandlers}>
            <Ionicons name="reorder-three-outline" size={22} color="#9CA3AF" />
          </View>
        );

        return (
          <View key={key}>
            {isDropTarget && <View style={styles.dropLine} />}

            <Animated.View
              style={[
                styles.itemWrap,
                isBeingDragged && {
                  transform:    [{ translateY: dragYAnim }],
                  zIndex:       999,
                  opacity:      0.92,
                  shadowColor:  '#000',
                  shadowOpacity: 0.18,
                  shadowRadius:  12,
                  shadowOffset:  { width: 0, height: 6 },
                  elevation:     8,
                },
              ]}
            >
              {renderItem(item, index, dragHandle)}
            </Animated.View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  itemWrap: {
    backgroundColor: 'transparent',
  },
  handleWrap: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropLine: {
    height: 3,
    backgroundColor: '#22C55E',
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 2,
  },
});
