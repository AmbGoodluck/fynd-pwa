import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import MomentsTab from '../components/MomentsTab';
import { useAuthStore } from '../store/useAuthStore';
import { useSharedTripStore } from '../store/useSharedTripStore';

type Props = { navigation: any; route?: any };

export default function MomentsScreen({ navigation, route }: Props) {
  const trip_id: string = route?.params?.trip_id ?? '';
  const tripName: string = route?.params?.tripName ?? 'Moments';
  const isMember: boolean = route?.params?.isMember ?? true;

  const { user: authUser } = useAuthStore();
  const { sessionUserId, sessionUserName } = useSharedTripStore();

  const effectiveUserId = authUser?.id || sessionUserId;
  const effectiveUserName =
    authUser?.fullName || authUser?.email?.split('@')[0] || sessionUserName || 'Explorer';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={tripName} onBack={() => navigation.goBack()} />
      <MomentsTab
        trip_id={trip_id}
        effectiveUserId={effectiveUserId}
        effectiveUserName={effectiveUserName}
        isMember={isMember}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
});
