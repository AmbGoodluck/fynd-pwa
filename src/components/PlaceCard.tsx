import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  name: string;
  description: string;
  distance: string;
  duration: string;
  rating: number;
  photoUrl: string;
  onSave?: () => void;
  onAdd?: () => void;
  isSaved?: boolean;
};

export default function PlaceCard({ name, description, distance, duration, rating, photoUrl, onSave, onAdd, isSaved }: Props) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: photoUrl }} style={styles.image} />
      <TouchableOpacity style={styles.heart} onPress={onSave}>
        <Text style={{ fontSize: 20 }}>{isSaved ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
        <View style={styles.row}>
          <Text style={styles.meta}>🚶 {distance}</Text>
          <Text style={styles.meta}>⏱ {duration}</Text>
          <Text style={styles.meta}>⭐ {rating}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addText}>+ Add to Itinerary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  image: { width: '100%', height: 160, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  heart: { position: 'absolute', top: 12, right: 12 },
  content: { padding: 12 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  description: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  meta: { fontSize: 12, color: '#6B7280' },
  addButton: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, alignItems: 'center' },
  addText: { color: '#22C55E', fontWeight: '600', fontSize: 13 },
});
