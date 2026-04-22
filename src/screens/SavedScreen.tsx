import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuestStore, type SavedPlace } from '../store/useGuestStore';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { F } from '../theme/fonts';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';
import { FALLBACK_IMAGE } from '../constants';

type Props = { navigation: any };

export default function SavedScreen({ navigation }: Props) {
  const { savedPlaces } = useGuestStore();
  const tabBarHeight = useTabBarHeight();

  const renderItem = ({ item }: { item: SavedPlace }) => {
    const desc = item.description || item.category || '';
    const meta = [item.city, item.category].filter(Boolean).join(' · ');

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('PlaceDetail', {
            placeId:     item.placeId,
            name:        item.name,
            address:     item.address || '',
            photoUrl:    item.photoUrl || FALLBACK_IMAGE,
            description: item.description || '',
            lat:         item.coordinates?.lat,
            lng:         item.coordinates?.lng,
            types:       item.types || [],
          })
        }
      >
        <Image
          source={{ uri: item.photoUrl || FALLBACK_IMAGE }}
          style={styles.cardImage}
        />
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {!!desc && (
            <Text style={styles.cardDesc} numberOfLines={1}>{desc}</Text>
          )}
          {!!meta && (
            <View style={styles.cardMeta}>
              <Ionicons name="location-outline" size={11} color={COLORS.text.hint} />
              <Text style={styles.cardMetaText} numberOfLines={1}>{meta}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.text.disabled} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        <Text style={styles.headerSub}>
          {savedPlaces.length} place{savedPlaces.length !== 1 ? 's' : ''} saved
        </Text>
      </View>

      {savedPlaces.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={48} color={COLORS.text.disabled} />
          <Text style={styles.emptyTitle}>No saved places yet</Text>
          <Text style={styles.emptySub}>
            Tap the bookmark on any place to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.placeId}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 24 }]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: { fontSize: 22, fontFamily: F.bold, color: COLORS.text.primary },
  headerSub:   { fontSize: 13, fontFamily: F.medium, color: COLORS.text.tertiary, marginTop: 2 },

  list: { paddingTop: SPACING.sm },

  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.xl, marginBottom: SPACING.md,
    padding: 14, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card.background,
    borderWidth: 1, borderColor: COLORS.card.border,
  },
  cardImage: {
    width: 64, height: 64, borderRadius: RADIUS.xs,
    marginRight: SPACING.md, backgroundColor: COLORS.border.light,
  },
  cardBody:     { flex: 1, gap: 3 },
  cardName:     { fontSize: 15, fontFamily: F.bold,    color: COLORS.text.primary },
  cardDesc:     { fontSize: 12, fontFamily: F.medium,  color: COLORS.text.tertiary },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 11, fontFamily: F.regular, color: COLORS.text.hint, flex: 1 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: F.bold,   color: COLORS.text.primary },
  emptySub: {
    fontSize: 13, fontFamily: F.medium, color: COLORS.text.tertiary,
    textAlign: 'center', lineHeight: 20,
  },
});
