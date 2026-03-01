import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, FlatList, Dimensions, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

const { width } = Dimensions.get('window');

const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
];

const SERVICE_ITEMS = [
  { id: '1', label: 'Currency\nExchange', icon: 'cash-outline', color: '#2A0BBF' },
  { id: '2', label: 'Transport', icon: 'car-outline', color: '#047433' },
  { id: '3', label: 'Police', icon: 'shield-outline', color: '#0D0474' },
  { id: '4', label: 'See All', icon: 'arrow-forward', color: '#0D0474' },
];

const RECENT_ITINERARIES = [
  { id: '1', city: 'New York', date: 'May 2024', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400' },
  { id: '2', city: 'London', date: 'August 2024', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400' },
  { id: '3', city: 'Sydney', date: 'Feb 2025', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400' },
];

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [currentBanner, setCurrentBanner] = useState(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user?.fullName?.split(' ')[0] || 'Traveller';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logoImg} />
        <Text style={styles.logoText}>Fynd</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Hero Banner */}
      <View style={styles.bannerContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (width - 28));
            setCurrentBanner(index);
          }}
        >
          {BANNER_IMAGES.map((img, i) => (
            <ImageBackground
              key={i}
              source={{ uri: img }}
              style={styles.bannerImage}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerGreeting}>{getGreeting()}, {firstName}</Text>
                <Text style={styles.bannerSub}>Where's your next adventure?</Text>
                <TouchableOpacity
                  style={styles.createTripBtn}
                  onPress={() => navigation.navigate('Create Trip')}
                >
                  <Text style={styles.createTripText}>Create Trip</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          ))}
        </ScrollView>
        {/* Dots */}
        <View style={styles.dots}>
          {BANNER_IMAGES.map((_, i) => (
            <View key={i} style={[styles.dot, currentBanner === i && styles.activeDot]} />
          ))}
        </View>
      </View>

      {/* ServiceHub Section */}
      <View style={styles.sectionHeader}>
        <TouchableOpacity style={styles.sectionLeft} onPress={() => navigation.navigate('ServiceHub')}>
          <Ionicons name="radio-outline" size={18} color="#111827" style={{ opacity: 0.6, marginRight: 4 }} />
          <Text style={styles.sectionTitle}>ServiceHub</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sectionRight} onPress={() => navigation.navigate('ServiceHub')}>
          <Text style={styles.seeAll}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color="#111827" style={{ opacity: 0.6 }} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceRow}>
        {SERVICE_ITEMS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.serviceCard} onPress={() => navigation.navigate('ServiceHub')}>
            <Ionicons name={item.icon as any} size={28} color={item.color} />
            <Text style={styles.serviceLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recent Itineraries Section */}
      <View style={styles.sectionHeader}>
        <TouchableOpacity style={styles.sectionLeft} onPress={() => navigation.navigate('Saved')}>
          <Ionicons name="calendar-outline" size={18} color="#111827" style={{ opacity: 0.6, marginRight: 4 }} />
          <Text style={styles.sectionTitle}>Recent Itineraries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sectionRight} onPress={() => navigation.navigate('Saved')}>
          <Text style={styles.seeAll}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color="#111827" style={{ opacity: 0.6 }} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itineraryRow}>
        {RECENT_ITINERARIES.map((item) => (
          <TouchableOpacity key={item.id} style={styles.itineraryCard}>
            <ImageBackground
              source={{ uri: item.image }}
              style={styles.itineraryImage}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={styles.itineraryOverlay}>
                <Text style={styles.itineraryCity}>{item.city}</Text>
                <Text style={styles.itineraryDate}>{item.date}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 48, paddingBottom: 8 },
  logoImg: { width: 53, height: 50, resizeMode: 'contain' },
  logoText: { fontSize: 25, fontWeight: '500', color: '#111827' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bannerContainer: { marginHorizontal: 14, marginTop: 14 },
  bannerImage: { width: width - 28, height: (width - 28) * 0.56, justifyContent: 'flex-end' },
  bannerOverlay: { padding: 14, borderRadius: 16 },
  bannerGreeting: { color: '#fff', fontSize: 22, fontWeight: '500', marginBottom: 4 },
  bannerSub: { color: '#fff', fontSize: 16, marginBottom: 12 },
  createTripBtn: { backgroundColor: '#22C55E', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16, alignSelf: 'flex-start' },
  createTripText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1FAE5' },
  activeDot: { backgroundColor: '#22C55E' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, marginTop: 16 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionRight: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  seeAll: { fontSize: 14, color: '#111827', marginRight: 2 },
  serviceRow: { paddingLeft: 7, marginTop: 8 },
  serviceCard: { width: 80, height: 100, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  serviceLabel: { fontSize: 12, textAlign: 'center', marginTop: 6, color: '#111827' },
  itineraryRow: { paddingLeft: 14, marginTop: 8 },
  itineraryCard: { marginRight: 8 },
  itineraryImage: { width: 120, height: 120, justifyContent: 'flex-end' },
  itineraryOverlay: { backgroundColor: 'rgba(20,24,27,0.5)', borderRadius: 16, padding: 4, paddingBottom: 8 },
  itineraryCity: { color: '#fff', fontSize: 14, fontWeight: '500', paddingHorizontal: 4 },
  itineraryDate: { color: '#fff', fontSize: 12, paddingHorizontal: 4 },
});
