import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { F } from '../../theme/fonts';

export default function CampusBanner() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 950, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.banner}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.semibold}>Berea College · </Text>
        <Text style={styles.bold}>47 classmates</Text>
        <Text style={styles.regular}> exploring today</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 10,
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
  },
  semibold: {
    fontFamily: F.semibold,
    color: '#065F46',
  },
  bold: {
    fontFamily: F.bold,
    color: '#065F46',
  },
  regular: {
    fontFamily: F.regular,
    color: '#065F46',
  },
});
