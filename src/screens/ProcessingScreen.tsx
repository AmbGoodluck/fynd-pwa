import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { F } from '../theme/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';

const MESSAGES = [
  'Matching your vibe\u2026',
  'Finding hidden gems\u2026',
  'Building your journey\u2026',
];

type Props = { navigation: any; route: any };

export default function ProcessingScreen({ navigation, route }: Props) {
  const params = route?.params || {};
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 1100);

    const navTimer = setTimeout(() => {
      navigation.replace('SuggestedPlaces', params);
    }, 3500);

    return () => {
      clearInterval(msgTimer);
      clearTimeout(navTimer);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.animationWrap}>
        <LottieView
          source={require('../../assets/loading.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
      <Text style={styles.message}>{MESSAGES[msgIndex]}</Text>
      <Text style={styles.subMessage}>This won't take long</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  animationWrap: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(34,197,94,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lottie: { width: 200, height: 200 },
  message: { fontSize: 20, fontFamily: F.bold, color: '#fff', marginTop: 28, textAlign: 'center', paddingHorizontal: 40 },
  subMessage: { fontSize: 14, fontFamily: F.regular, color: '#6B7280', marginTop: 8, textAlign: 'center' },
});
