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

        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>Spotlight</Text>
            <View style={styles.adPill}>
              <Text style={styles.adPillText}>AD</Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.headerSubtitle}>Personalised travel deals & experiences picker for you</Text>


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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarTitle: { fontSize: 24, fontFamily: F.bold, color: '#111827', letterSpacing: -0.5 },
  adPill: { backgroundColor: '#F3F4F6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  adPillText: { fontSize: 10, color: '#6B7280', fontFamily: F.bold, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, fontFamily: F.medium, color: '#6B7280', paddingHorizontal: 16, marginBottom: 20, lineHeight: 20 },
  categoryRow: { marginBottom: 20 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, borderWidth: 1.5, borderColor: '#F2F2F7' },
  categoryChipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  categoryLabel: { fontSize: 13, color: '#4B5563', fontFamily: F.semibold },
  categoryLabelActive: { color: '#fff' },
  heroCard: { marginHorizontal: 16, marginBottom: 24, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  heroImage: { width: '100%', height: 320, justifyContent: 'space-between' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  heroBadge: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  heroBadgeText: { color: '#fff', fontSize: 12, fontFamily: F.bold },
  heroDiscount: { backgroundColor: '#22C55E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  heroDiscountText: { color: '#fff', fontSize: 12, fontFamily: F.bold },
  heroBottom: { backgroundColor: 'rgba(0,0,0,0.45)', padding: 20 },
  heroPartnerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroPartner: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: F.medium },
  sponsoredDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 8 },
  heroTitle: { fontSize: 26, fontFamily: F.bold, color: '#fff', marginBottom: 4, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 16, fontFamily: F.medium },
  heroPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroPrice: { fontSize: 24, fontFamily: F.bold, color: '#4ADE80' },
  heroOriginalPrice: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through', fontFamily: F.medium },
  bookHeroBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10, marginLeft: 'auto' },
  bookHeroBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: F.bold, color: '#111827' },
  sectionCount: { fontSize: 13, fontFamily: F.medium, color: '#6B7280' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  dealCard: { width: cardWidth + 8, backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, marginHorizontal: 6, borderWidth: 1, borderColor: '#F2F2F7', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  dealImage: { width: '100%', height: 150, justifyContent: 'space-between' },
  dealTopRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  dealTagWrap: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dealTag: { fontSize: 10, color: '#fff', fontFamily: F.bold, letterSpacing: 0.5 },
  dealDiscountWrap: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dealDiscount: { fontSize: 10, color: '#fff', fontFamily: F.bold },
  dealContent: { padding: 14 },
  dealBadge: { fontSize: 11, fontFamily: F.semibold, color: '#6B7280', marginBottom: 4 },
  dealTitle: { fontSize: 14, fontFamily: F.bold, color: '#111827', marginBottom: 6, lineHeight: 20 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dealPrice: { fontSize: 16, fontFamily: F.bold, color: '#22C55E' },
  dealOriginal: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through', fontFamily: F.medium },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 12 },
  dealPartner: { fontSize: 11, color: '#9CA3AF', fontFamily: F.medium },
  dealBookBtn: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#22C55E' },
  dealBookBtnText: { color: '#22C55E', fontSize: 12, fontFamily: F.bold },

  partnersSection: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 16 },
  partnersTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  partnersSubtitle: { fontSize: 12, color: '#8E8E93', marginBottom: 12, lineHeight: 18 },
  partnersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partnerChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E5E5EA' },
  partnerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  partnerName: { fontSize: 12, color: '#111827', fontWeight: '500' },
  disclaimer: { fontSize: 11, color: '#8E8E93', paddingHorizontal: 16, textAlign: 'center', lineHeight: 16, marginBottom: 8 },
});
