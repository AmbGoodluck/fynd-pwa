import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
type Props = { navigation: any };
export default function SubscriptionScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="chevron-back" size={32} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.title}>Fynd Plus</Text>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 14 },
  back: { marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
});
