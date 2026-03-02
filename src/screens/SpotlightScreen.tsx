import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ImageBackground, Dimensions, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'hotels', label: 'Hotels', icon: 'bed-outline' },
  { id: 'flights', label: 'Flights', icon: 'airplane-outline' },
  { id: 'experiences', label: 'Experiences', icon: 'compass-outline' },
  { id: 'restaurants', label: 'Restaurants', icon: 'restaurant-outline' },
  { id: 'activities', label: 'Activities', icon: 'bicycle-outline' },
];

const HERO_DEAL = {
  id: 'hero1',
  title: 'Maldives Overwater Villa',
  subtitle: 'All-inclusive  5 nights',
  price: '$899',
  originalPrice: '$1,400',
  discount: '36% OFF',
  badge: ' Limited Time',
  partner: 'Booking.com',
  image: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800',
  url: 'https://booking.com',
  category: 'hotels',
};

const DEALS = [
  {
    id: '1', title: 'Santorini Sunset Suite', category: 'hotels',
    price: '$320/night', originalPrice: '$480/night', discount: '33% OFF',
    badge: ' Sponsored', partner: 'Airbnb',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400',
    url: 'https://airbnb.com', tag: 'Hotel',
  },
  {
    id: '2', title: 'Tokyo Food & Culture Tour', category: 'experiences',
    price: '$89/person', originalPrice: '$120/person', discount: '26% OFF',
    badge: ' Top Rated', partner: 'Viator',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400',
    url: 'https://viator.com', tag: 'Experience',
  },
  {
    id: '3', title: 'London to Paris Flight', category: 'flights',
    price: '$49', originalPrice: '$120', discount: '59% OFF',
    badge: ' Flash Sale', partner: 'Skyscanner',
    image: 'https://images.unsplash.com/photo-1499856871958-5b9357976b82?w=400',
    url: 'https://skyscanner.com', tag: 'Flight',
  },
  {
    id: '4', title: 'Nobu Matsuhisa Malibu', category: 'restaurants',
    price: 'From $85', originalPrice: null, discount: null,
    badge: ' Sponsored', partner: 'OpenTable',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
    url: 'https://opentable.com', tag: 'Restaurant',
  },
  {
    id: '5', title: 'Bali Surf & Yoga Retreat', category: 'activities',
    price: '$199/week', originalPrice: '$350/week', discount: '43% OFF',
    badge: ' Trending', partner: 'GetYourGuide',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    url: 'https://getyourguide.com', tag: 'Activity',
  },
  {
    id: '6', title: 'New York City Pass', category: 'activities',
    price: '$132', originalPrice: '$200', discount: '34% OFF',
    badge: ' Best Seller', partner: 'Viator',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400',
    url: 'https://viator.com', tag: 'Activity',
  },
  {
    id: '7', title: 'Dubai Luxury Hotel', category: 'hotels',
    price: '$210/night', originalPrice: '$380/night', discount: '45% OFF',
    badge: ' Sponsored', partner: 'Booking.com',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400',
    url: 'https://booking.com', tag: 'Hotel',
  },
  {
    id: '8', title: 'Amazon Rainforest Trek', category: 'experiences',
    price: '$149/person', originalPrice: '$220/person', discount: '32% OFF',
    badge: ' Eco Pick', partner: 'GetYourGuide',
    image: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=400',
    url: 'https://getyourguide.com', tag: 'Experience',
  },
  {
    id: '9', title: 'Cape Town Rooftop Bar', category: 'restaurants',
    price: 'From $40', originalPrice: null, discount: null,
    badge: ' Sponsored', partner: 'OpenTable',
    image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400',
    url: 'https://opentable.com', tag: 'Restaurant',
  },
  {
    id: '10', title: 'Bangkok to Phuket', category: 'flights',
    price: '$29', originalPrice: '$89', discount: '67% OFF',
    badge: ' Hot Deal', partner: 'Skyscanner',
    image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400',
    url: 'https://skyscanner.com', tag: 'Flight',
  },
];

const PARTNERS = [
  { name: 'Booking.com', color: '#003580' },
  { name: 'Airbnb', color: '#FF5A5F' },
  { name: 'Viator', color: '#1A1A2E' },
  { name: 'Skyscanner', color: '#0770E3' },
  { name: 'GetYourGuide', color: '#FF5526' },
  { name: 'OpenTable', color: '#DA3743' },
];

type Props = { navigation: any };

export default function SpotlightScreen({ navigation }: Props) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredDeals = activeCategory === 'all'
    ? DEALS
    : DEALS.filter(d => d.category === activeCategory);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>Spotlight</Text>
            <View style={styles.adPill}>
              <Text style={styles.adPillText}>Ad</Text>
            </View>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.headerSubtitle}>Deals & destinations picked for your travel style</Text>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={14} color={activeCategory === cat.id ? '#fff' : '#57636C'} style={{ marginRight: 4 }} />
              <Text style={[styles.categoryLabel, activeCategory === cat.id && styles.categoryLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hero Deal */}
        {(activeCategory === 'all' || activeCategory === HERO_DEAL.category) && (
          <TouchableOpacity style={styles.heroCard} onPress={() => openLink(HERO_DEAL.url)}>
            <ImageBackground
              source={{ uri: HERO_DEAL.image }}
              style={styles.heroImage}
              imageStyle={{ borderRadius: 20 }}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{HERO_DEAL.badge}</Text>
                </View>
                <View style={styles.heroDiscount}>
                  <Text style={styles.heroDiscountText}>{HERO_DEAL.discount}</Text>
                </View>
              </View>
              <View style={styles.heroBottom}>
                <View style={styles.heroPartnerRow}>
                  <Text style={styles.heroPartner}>via {HERO_DEAL.partner}</Text>
                  <View style={styles.sponsoredDot} />
                  <Text style={styles.heroPartner}>Sponsored</Text>
                </View>
                <Text style={styles.heroTitle}>{HERO_DEAL.title}</Text>
                <Text style={styles.heroSubtitle}>{HERO_DEAL.subtitle}</Text>
                <View style={styles.heroPriceRow}>
                  <Text style={styles.heroPrice}>{HERO_DEAL.price}</Text>
                  <Text style={styles.heroOriginalPrice}>{HERO_DEAL.originalPrice}</Text>
                  <TouchableOpacity style={styles.bookHeroBtn} onPress={() => openLink(HERO_DEAL.url)}>
                    <Text style={styles.bookHeroBtnText}>Book Now</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        )}

        {/* Personalised label */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Based on your vibes</Text>
          <Text style={styles.sectionCount}>{filteredDeals.length} deals</Text>
        </View>

        {/* Deals Grid */}
        <View style={styles.grid}>
          {filteredDeals.map((deal, index) => (
            <TouchableOpacity key={deal.id} style={[styles.dealCard, index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 }]} onPress={() => openLink(deal.url)}>
              <ImageBackground
                source={{ uri: deal.image }}
                style={styles.dealImage}
                imageStyle={{ borderRadius: 16 }}
              >
                <View style={styles.dealTopRow}>
                  <View style={styles.dealTagWrap}>
                    <Text style={styles.dealTag}>{deal.tag}</Text>
                  </View>
                  {deal.discount && (
                    <View style={styles.dealDiscountWrap}>
                      <Text style={styles.dealDiscount}>{deal.discount}</Text>
                    </View>
                  )}
                </View>
              </ImageBackground>
              <View style={styles.dealContent}>
                <Text style={styles.dealBadge}>{deal.badge}</Text>
                <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
                <View style={styles.dealPriceRow}>
                  <Text style={styles.dealPrice}>{deal.price}</Text>
                  {deal.originalPrice && <Text style={styles.dealOriginal}>{deal.originalPrice}</Text>}
                </View>
                <View style={styles.dealFooter}>
                  <Text style={styles.dealPartner}>via {deal.partner}</Text>
                  <TouchableOpacity style={styles.dealBookBtn} onPress={() => openLink(deal.url)}>
                    <Text style={styles.dealBookBtnText}>Book</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Partners Section */}
        <View style={styles.partnersSection}>
          <Text style={styles.partnersTitle}>Our Booking Partners</Text>
          <Text style={styles.partnersSubtitle}>Tap any deal to book securely through our trusted partners</Text>
          <View style={styles.partnersGrid}>
            {PARTNERS.map(p => (
              <View key={p.name} style={styles.partnerChip}>
                <View style={[styles.partnerDot, { backgroundColor: p.color }]} />
                <Text style={styles.partnerName}>{p.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Fynd may earn a commission when you book through our partners. This helps keep the app free. Prices shown are indicative and subject to availability.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 100 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 4 },
  topBarCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  adPill: { backgroundColor: '#F2F2F7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  adPillText: { fontSize: 11, color: '#57636C', fontWeight: '600' },
  headerSubtitle: { fontSize: 13, color: '#8E8E93', paddingHorizontal: 16, marginBottom: 12 },
  categoryRow: { marginBottom: 16 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  categoryChipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  categoryLabel: { fontSize: 13, color: '#57636C', fontWeight: '500' },
  categoryLabelActive: { color: '#fff' },
  heroCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  heroImage: { width: '100%', height: 280, justifyContent: 'space-between' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  heroBadge: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroDiscount: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  heroDiscountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroBottom: { backgroundColor: 'rgba(0,0,0,0.55)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, padding: 16 },
  heroPartnerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  heroPartner: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  sponsoredDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 6 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  heroPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPrice: { fontSize: 22, fontWeight: '700', color: '#22C55E' },
  heroOriginalPrice: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through' },
  bookHeroBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 'auto' },
  bookHeroBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  sectionCount: { fontSize: 13, color: '#8E8E93' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  dealCard: { width: cardWidth, backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, borderWidth: 0.5, borderColor: '#E5E5EA', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  dealImage: { width: '100%', height: 130, justifyContent: 'space-between' },
  dealTopRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 8 },
  dealTagWrap: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  dealTag: { fontSize: 10, color: '#fff', fontWeight: '600' },
  dealDiscountWrap: { backgroundColor: '#22C55E', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  dealDiscount: { fontSize: 10, color: '#fff', fontWeight: '700' },
  dealContent: { padding: 10 },
  dealBadge: { fontSize: 11, color: '#57636C', marginBottom: 2 },
  dealTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4, lineHeight: 18 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  dealPrice: { fontSize: 14, fontWeight: '700', color: '#22C55E' },
  dealOriginal: { fontSize: 11, color: '#8E8E93', textDecorationLine: 'line-through' },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dealPartner: { fontSize: 10, color: '#8E8E93' },
  dealBookBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  dealBookBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  partnersSection: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 16 },
  partnersTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  partnersSubtitle: { fontSize: 12, color: '#8E8E93', marginBottom: 12, lineHeight: 18 },
  partnersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partnerChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E5E5EA' },
  partnerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  partnerName: { fontSize: 12, color: '#111827', fontWeight: '500' },
  disclaimer: { fontSize: 11, color: '#8E8E93', paddingHorizontal: 16, textAlign: 'center', lineHeight: 16, marginBottom: 8 },
});
