import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme/tokens';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
};

export default function FyndButton({ title, onPress, loading, disabled, variant = 'primary' }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, variant === 'outline' && styles.outline, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.accent.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: 'transparent', padding: 0, borderRadius: 30, alignItems: 'center' },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.accent.primary },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontWeight: '600', fontSize: 16 },
  outlineText: { color: COLORS.accent.primary },
});
