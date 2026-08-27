import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';

export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === 'ADMIN' || user.role === 'ENTERPRISE_ADMIN' || user.role === 'MASTER') {
          router.replace('/(app)/admin');
        } else {
          router.replace('/(app)/punch');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
