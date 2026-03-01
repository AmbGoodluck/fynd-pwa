import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

const CATEGORIES = [
  { id: 'Medical', label: 'Medical', icon: 'medkit', color: '#E90909' },
  { id: 'Currency', label: 'Currency\nExchange', icon: 'cash', color: '#2A0BBF' },
  { id: 'Bathrooms', label: 'Public\nBathrooms', icon: 'man', color: '#111827' },
  { id: 'Transport', label: 'Transport', icon: 'car', color: '#047433' },
  { id: 'Police', label: 'Police', icon: 'shield', color: '#0D0474' },
  { id: 'Wifi', label: 'Public Wifi', icon: 'wifi', color: '#111827' },
  { id: 'Embassies', label: 'Embassies', icon: 'business', color: '#2A0BBF' },
];

const MOCK_RESULTS = [
  { id: '1', name: 'Hillside Clinic', category: 'Medical', time: '2 min', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400' },
  { id: '2', name: 'Bayview Hospital', category: 'Medical', time: '13 min', image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400' },
  { id: '3', name: 'Amadu Pharmaceuticals', category: 'Medical', time: '26 min', image: 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=400' },
  { id: '4', name: 'Essence Medical Lab', category: 'Medical', time: '26 min', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400' },
];

type Props = { navigation: any };

export default function ServiceHubScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('Medical');
  const firstName = user?.fullName?.split(' ')[0] || 'U';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={32} color="#111827" />
        </TouchableOpacity>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.headerBox}>
        <Text style={styles.title}>ServiceHub</Text>
        <Text style={styles.subtitle}>Select a service to view close by locations</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          bounces={true}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardSelected]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={28} color={selectedCategory === cat.id ? '#22C55E' : cat.color} />
              <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelSelected]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.resultsBox}>
        <Text style={styles.resultsTitle}>Showing nearby results</Text>
        <FlatList
          data={MOCK_RESULTS}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>
              <TouchableOpacity style={styles.routeBtn}>
                <Text style={styles.routeBtnText}>Route</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  logo: { width: 80, height: 40, resizeMode: 'contain' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerBox: { backgroundColor: '#F2F2F7', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 10, marginTop: 14, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 1, height: 0 }, elevation: 2 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827', paddingHorizontal: 24, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#57636C', paddingHorizontal: 18, marginBottom: 12 },
  categoryRow: { paddingHorizontal: 8, paddingBottom: 16, paddingTop: 4, flexDirection: 'row' },
  categoryCard: { width: 80, height: 90, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  categoryCardSelected: { borderColor: '#22C55E', borderWidth: 2 },
  categoryLabel: { fontSize: 11, color: '#111827', textAlign: 'center', marginTop: 6 },
  categoryLabelSelected: { color: '#22C55E', fontWeight: '600' },
  resultsBox: { flex: 1, backgroundColor: '#fff', paddingTop: 4 },
  resultsTitle: { fontSize: 16, color: '#111827', padding: 14 },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginVertical: 4, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3, padding: 8 },
  cardImage: { width: 80, height: 90, borderRadius: 8, resizeMode: 'cover' },
  cardContent: { flex: 1, paddingLeft: 10 },
  cardName: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 4 },
  cardCategory: { fontSize: 14, color: '#57636C', marginBottom: 4 },
  cardTime: { fontSize: 14, color: '#E30707' },
  routeBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start', marginRight: 4, marginTop: 12 },
  routeBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
});
