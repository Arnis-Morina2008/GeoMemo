import { ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { ThemedView } from '@/components/themed-view';

export default function Layout() {
  const { user, isLoading } = useApp();

  // Only show the loading screen during the initial auth check on startup.
  // This prevents the entire navigation stack from unmounting and resetting
  // during background data refreshes (e.g., when adding or editing a place).
  if (isLoading && !user) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </ThemedView>
    );
  }

  if (!user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

