import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');
type Props = { navigation: any };
export default function Onboarding4Screen({ navigation }: Props) {
  const handleGetStarted = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    navigation.replace('Register');
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Journey{'\n'}Starts Here</Text>
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
      </View>
      <View style={styles.imageBox}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&q=80' }}
          style={styles.image}
          imageStyle={{ borderRadius: 24 }}
          defaultSource={require('../../assets/splash-icon.png')}
        />
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleGetStarted}>
        <Text style={styles.btnText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 80 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#111827', lineHeight: 36, paddingHorizontal: 20 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1FAE5' },
  activeDot: { backgroundColor: '#22C55E', width: 20 },
  imageBox: { width: width - 60, height: height * 0.45, marginTop: 30, borderRadius: 24, backgroundColor: '#F2F2F7', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  btn: { position: 'absolute', bottom: 48, width: width - 64, backgroundColor: '#22C55E', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
