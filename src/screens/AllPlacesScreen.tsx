import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { F } from '../theme/fonts';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';
import { FALLBACK_IMAGE } from '../constants';
import type { FyndPlace } from '../services/freePlacesService';
import { useGuestStore } from '../store/useGuestStore';
import { useTabBarHeight } from '../hooks/useTabBarHeight';

type Props = { navigation: any; route: any };

export default function AllPlacesScreen({ navigation, route }: Props) {
  const { places = [] as FyndPlace[], cityName = 'Nearby', showVisitPrompt = false } = route.params || {};
  const tabBarHeight = useTabBarHeight();
  const { savePlace, unsavePlace, savedPlaces, isGuest } = useGuestStore();

  const navToPlace = (place: FyndPlace) =>
    navigation.navigate('PlaceDetail', {
      placeId:     place.id,
      name:        place.name,
      address:     place.address,
      photoUrl:    place.photo_urls[0] ?? '',
      photoUrls:   place.photo_urls,
      description: place.ai_description ?? '',
      lat:         place.lat,
      lng:         place.lng,
      types:       place.types,
      phone:       place.phone ?? '',
      website:     place.website ?? '',
      place,
    });

  const renderItem = ({ item: place }: { item: FyndPlace }) => {
    const isSaved = savedPlaces.some(p => p.placeId === place.id);
    const desc = place.ai_description
      ? place.ai_description.split('.')[0] + '.'
      : '';

    const handleSave = () => {
      if (isGuest) return;
      if (isSaved) {
        unsavePlace(place.id);
      } else {
        savePlace({
          placeId:     place.id,
          name:        place.name,
          address:     place.address,
          description: desc,
          photoUrl:    place.photo_urls[0] ?? FALLBACK_IMAGE,
          photoUrls:   place.photo_urls,
          coordinates: { lat: place.lat, lng: place.lng },
          category:    place.types[0]?.replace(/_/g, ' ') || 'place',
          types:       place.types,
          city:        place.city,
        } as any);
      }
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navToPlace(place)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: place.photo_urls[0] ?? FALLBACK_IMAGE }}
          style={styles.cardImage}
        />
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{place.name}</Text>
          {!!desc && (
            <Text style={styles.cardDesc} numberOfLines={2}>{desc}</Text>
          )}
          <View style={styles.cardMeta}>
            {place.vibe ? (
              <View style={styles.vibePill}>
                <Text style={styles.vibePillText}>{place.vibe}</Text>
              </View>
            ) : place.types[0] ? (
              <Text style={styles.typeText}>{place.types[0].replace(/_/g, ' ')}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={20}
            color={isSaved ? COLORS.accent.primary : COLORS.text.disabled}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Places near {cityName}</Text>
          <Text style={styles.headerSub}>
            {places.length} place{places.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {showVisitPrompt && (
        <View style={styles.visitBanner}>
          <Ionicons name="walk-outline" size={15} color={COLORS.accent.primary} />
          <Text style={styles.visitBannerText}>Tap a place you visited to let us know</Text>
        </View>
      )}

      <FlatList
        data={places}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 24 }]}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={COLORS.text.disabled} />
            <Text style={styles.emptyText}>No places found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.light,
  },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 17, fontFamily: F.bold, color: COLORS.text.primary },
  headerSub:   { fontSize: 12, fontFamily: F.medium, color: COLORS.text.tertiary, marginTop: 2 },

  visitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent.primaryLight,
    paddingHorizontal: SPACING.xl, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(232,80,58,0.12)',
  },
  visitBannerText: {
    fontSize: 13, fontFamily: F.medium, color: COLORS.accent.primary, flex: 1,
  },

  list: { paddingTop: SPACING.sm },

  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.xl, marginBottom: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card.background,
    borderWidth: 1, borderColor: COLORS.card.border,
    shadowColor: '#1A1019', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardImage: {
    width: 72, height: 72, borderRadius: RADIUS.xs,
    marginRight: SPACING.md, backgroundColor: COLORS.border.light,
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontFamily: F.bold, color: COLORS.text.primary },
  cardDesc: {
    fontSize: 12, fontFamily: F.regular,
    color: COLORS.text.tertiary, lineHeight: 16,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  vibePill: {
    backgroundColor: COLORS.accent.primaryLight, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  vibePillText: { fontSize: 10, fontFamily: F.semibold, color: COLORS.accent.primary },
  typeText: {
    fontSize: 11, fontFamily: F.regular,
    color: COLORS.text.hint, textTransform: 'capitalize',
  },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyText: { fontSize: 16, fontFamily: F.semibold, color: COLORS.text.tertiary },
});
