import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

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
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
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
  logo: {
    width: width * 0.8,
    height: height * 0.3,
  },
});
