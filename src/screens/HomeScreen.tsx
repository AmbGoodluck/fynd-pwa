import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Dimensions, FlatList, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { getRecentItineraries } from '../services/database';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');

const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
];

const SERVICE_ITEMS = [
  { id: '1', label: 'Currency\nExchange', icon: 'cash-outline', color: '#2A0BBF' },
  { id: '2', label: 'Transport', icon: 'car-outline', color: '#047433' },
  { id: '3', label: 'Police', icon: 'shield-outline', color: '#1D3557' },
  { id: '4', label: 'See All', icon: 'chevron-forward', color: '#22C55E' },
];

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [recentItineraries, setRecentItineraries] = useState<any[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    loadItineraries();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (bannerIndex + 1) % BANNER_IMAGES.length;
      setBannerIndex(next);
      bannerRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [bannerIndex]);

  const loadItineraries = async () => {
    if (!user?.id) { setLoadingItineraries(false); return; }
    try {
      const data = await getRecentItineraries(user.id, 5);
      setRecentItineraries(data);
    } catch (e) {
      console.log('Error loading itineraries:', e);
    } finally {
      setLoadingItineraries(false);
    }
  };

  const formatMonth = (createdAt: any) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} showLogo showAvatar />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Banner */}
        <View style={styles.bannerWrap}>
          <FlatList
            ref={bannerRef}
            data={BANNER_IMAGES}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <ImageBackground source={{ uri: item }} style={styles.banner} imageStyle={styles.bannerImage}>
                <View style={styles.bannerOverlay}>
                  <Text style={styles.bannerGreeting}>{getGreeting()}, {user?.fullName?.split(' ')[0] || 'Traveller'}</Text>
                  <Text style={styles.bannerSub}>Where's your next adventure?</Text>
                  <TouchableOpacity style={styles.createTripBtn} onPress={() => navigation.navigate('Create Trip')}>
                    <Text style={styles.createTripBtnText}>Create Trip</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            )}
          />
          <View style={styles.dots}>
            {BANNER_IMAGES.map((_, i) => (
              <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Service Hub */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="compass-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>ServiceHub</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ServiceHub')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color="#22C55E" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceRow}>
          {SERVICE_ITEMS.map(item => (
            <TouchableOpacity key={item.id} style={styles.serviceCard} onPress={() => navigation.navigate('ServiceHub')}>
              <Ionicons name={item.icon as any} size={28} color={item.color} />
              <Text style={styles.serviceLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Itineraries */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="calendar-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Recent Itineraries</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Saved')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color="#22C55E" />
          </TouchableOpacity>
        </View>

        {loadingItineraries ? (
          <ActivityIndicator color="#22C55E" style={{ marginTop: 20 }} />
        ) : recentItineraries.length === 0 ? (
          <View style={styles.emptyItinerary}>
            <Ionicons name="map-outline" size={40} color="#E5E5EA" />
            <Text style={styles.emptyText}>No itineraries yet</Text>
            <Text style={styles.emptySubText}>Create your first trip to get started!</Text>
<TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Create Trip')}>
              <Text style={styles.startBtnText}>Create Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itineraryRow}>
            {recentItineraries.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.itineraryCard}
                onPress={() => navigation.navigate('Itinerary', { itineraryId: item.id })}
              >
                <ImageBackground
                  source={{ uri: item.coverPhotoUrl || BANNER_IMAGES[0] }}
                  style={styles.itineraryCardBg}
                  imageStyle={{ borderRadius: 16 }}
                >
                  <View style={styles.itineraryCardOverlay}>
                    <Text style={styles.itineraryCardTitle}>{item.destination}</Text>
                    <Text style={styles.itineraryCardDate}>{formatMonth(item.createdAt)}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 20 },
  bannerWrap: { marginHorizontal: 14, marginTop: 8, marginBottom: 16 },
  banner: { width: width - 28, height: 200, borderRadius: 20, overflow: 'hidden' },
  bannerImage: { borderRadius: 20 },
  bannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, padding: 20, justifyContent: 'flex-end' },
  bannerGreeting: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
  createTripBtn: { alignSelf: 'flex-start', backgroundColor: '#22C55E', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  createTripBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E5EA' },
  dotActive: { backgroundColor: '#22C55E', width: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 10, marginTop: 4 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: '#22C55E', fontWeight: '500' },
  serviceRow: { paddingLeft: 14, marginBottom: 16 },
  serviceCard: { width: 80, height: 80, borderRadius: 16, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#fff' },
  serviceLabel: { fontSize: 10, textAlign: 'center', color: '#57636C', marginTop: 4 },
  itineraryRow: { paddingLeft: 14 },
  itineraryCard: { width: 150, height: 120, borderRadius: 16, marginRight: 12, overflow: 'hidden' },
  itineraryCardBg: { width: 150, height: 120, justifyContent: 'flex-end' },
  itineraryCardOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  itineraryCardTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  itineraryCardDate: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  emptyItinerary: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 12, marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#57636C', textAlign: 'center', marginBottom: 16 },
  startBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 10 },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
