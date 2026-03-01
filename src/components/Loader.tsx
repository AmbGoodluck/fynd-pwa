import React from 'react';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';

type Props = {
  message?: string;
};

export default function Loader({ message = 'Finding the best places for you...' }: Props) {
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
      <ActivityIndicator size="large" color="#22C55E" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  logo: { width: 80, height: 80, marginBottom: 24, resizeMode: 'contain' },
  spinner: { marginBottom: 16 },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
});

