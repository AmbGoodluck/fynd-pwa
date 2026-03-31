import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { F } from '../../theme/fonts';

interface Props {
  label: string;
}

export default function NotificationSectionHeader({ label }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  label: {
    fontSize: 11,
    fontFamily: F.semibold,
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
});
