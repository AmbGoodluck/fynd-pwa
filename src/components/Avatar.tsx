import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '../theme/tokens';

type Props = {
  photoUrl?: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
};

export default function Avatar({ photoUrl, name, size = 40, onPress }: Props) {
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <TouchableOpacity onPress={onPress}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  placeholder: { backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center' },
  initials: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
