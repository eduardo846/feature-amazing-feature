/**
 * Root layout for the Expo Router app.
 *
 * Wraps the entire navigation tree in a {@link GestureHandlerRootView} (required
 * by react-native-gesture-handler / reanimated) and declares the top-level
 * {@link Stack} navigator that hosts the `(auth)` and `(app)` route groups.
 *
 * Global providers (theme, state hydration gating, fonts, toasts) are composed
 * here as later issues land — see Issues 3 (Zustand) and 4 (Typography/fonts).
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { NetworkProvider } from '../src/offline/NetworkProvider';
import { ToastProvider } from '../src/context/ToastContext';

/**
 * Application root layout rendered once at the top of the navigation tree.
 *
 * @returns The gesture-handler-wrapped root stack navigator.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <NetworkProvider>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
            <StatusBar style="auto" />
          </ToastProvider>
        </NetworkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
