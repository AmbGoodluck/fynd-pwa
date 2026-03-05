import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        navigation.replace('MainTabs');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/find-splash.jpg')}
        style={styles.splash}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  splash: { width, height },
});
