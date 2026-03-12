/**
 * DraggableList — lightweight drag-and-drop list using core RN APIs only.
 * Uses PanResponder + Animated.  Zero new native dependencies.
 * Works reliably on Android and iOS.
 *
 * Usage:
 *   <DraggableList
 *     data={stops}
 *     keyExtractor={item => item.id}
 *     itemHeight={ITEM_HEIGHT}
 *     onReorder={newData => setStops(newData)}
 *     renderItem={(item, index, dragHandle) => (
 *       <MyCard item={item} dragHandle={dragHandle} />
 *     )}
 *   />
 *
 * The `dragHandle` prop is a React element you can place anywhere in the card
 * to be the drag trigger.
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
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const startY = useRef(0);
  const currentDraggingIndex = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  // Internal data copy used for visual reordering during drag
  const [liveData, setLiveData] = useState<T[]>(data);

  // Keep liveData in sync when parent data changes (but not during a drag)
  const isDragging = useRef(false);
  React.useEffect(() => {
    if (!isDragging.current) setLiveData(data);
  }, [data]);

  const buildPanResponder = useCallback((index: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,

      onPanResponderGrant: (_, gs) => {
        isDragging.current = true;
        currentDraggingIndex.current = index;
        startY.current = gs.y0;
        dragY.setValue(0);
        setDraggingIndex(index);
        setTargetIndex(index);
        setScrollEnabled(false);
      },

      onPanResponderMove: (_, gs) => {
        dragY.setValue(gs.dy);
        const rawTarget = index + Math.round(gs.dy / itemHeight);
        const clamped = Math.max(0, Math.min(liveData.length - 1, rawTarget));
        setTargetIndex(clamped);
      },

      onPanResponderRelease: (_, gs) => {
        const rawTarget = index + Math.round(gs.dy / itemHeight);
        const finalTarget = Math.max(0, Math.min(liveData.length - 1, rawTarget));

        // Reorder
        if (finalTarget !== index) {
          const reordered = [...liveData];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(finalTarget, 0, moved);
          setLiveData(reordered);
          onReorder(reordered);
        }

        // Reset
        isDragging.current = false;
        currentDraggingIndex.current = null;
        dragY.setValue(0);
        setDraggingIndex(null);
        setTargetIndex(null);
        setScrollEnabled(true);
      },

      onPanResponderTerminate: () => {
        isDragging.current = false;
        currentDraggingIndex.current = null;
        dragY.setValue(0);
        setDraggingIndex(null);
        setTargetIndex(null);
        setScrollEnabled(true);
      },
    }), [liveData, itemHeight, onReorder]);

  return (
    <ScrollView
      ref={scrollRef}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      style={style}
    >
      {liveData.map((item, index) => {
        const key = keyExtractor(item);
        const isBeingDragged = draggingIndex === index;

        // Target drop indicator: show a green line above the target slot
        const isDropTarget = targetIndex === index && draggingIndex !== null && draggingIndex !== index;

        const panResponder = buildPanResponder(index);

        const dragHandle = (
          <View
            style={styles.handleWrap}
            {...panResponder.panHandlers}
          >
            <Ionicons name="reorder-three-outline" size={22} color="#9CA3AF" />
          </View>
        );

        return (
          <View key={key}>
            {/* Drop target indicator */}
            {isDropTarget && <View style={styles.dropLine} />}

            <Animated.View
              style={[
                styles.itemWrap,
                isBeingDragged && {
                  transform: [{ translateY: dragY }],
                  zIndex: 999,
                  opacity: 0.92,
                  shadowColor: '#000', shadowOpacity: 0.18,
                  shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
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
