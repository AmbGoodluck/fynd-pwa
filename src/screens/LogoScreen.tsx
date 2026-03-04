import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

type Props = { navigation: any };

export default function LogoScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        navigation.replace('Splash');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.version}>v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    width: width * 0.65,
    height: height * 0.22,
  },
  version: {
    position: 'absolute',
    bottom: 36,
    fontSize: 12,
    color: '#D1D5DB',
    letterSpacing: 1,
  },
});
