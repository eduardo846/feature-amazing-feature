/**
 * OfflineScreen — Issue 1
 * "Design heavily offline-capable degraded application logic protecting
 *  user operations natively"
 *
 * Shown when the app is fully offline AND has no cached data.
 * Displays pending queue count and a retry button.
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNetwork } from '../offline/NetworkProvider';
import { useTheme } from '../theme/ThemeProvider';
import { FontSize, FontWeight, Radius, Spacing } from '../theme/tokens';

export function OfflineScreen() {
  const { colors } = useTheme();
  const { syncStatus, pendingOpsCount, flushQueue, isOnline } = useNetwork();

  const handleRetry = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await flushQueue();
  }, [flushQueue]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text style={styles.icon}>📡</Text>

        <Text style={[styles.title, { color: colors.text }]}>
          You're Offline
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          No internet connection detected. Your changes are safely queued and
          will sync automatically when you reconnect.
        </Text>

        {pendingOpsCount > 0 && (
          <View style={[styles.queueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.queueLabel, { color: colors.textSecondary }]}>
              Queued changes
            </Text>
            <Text style={[styles.queueCount, { color: colors.text }]}>
              {pendingOpsCount}
            </Text>
          </View>
        )}

        {isOnline && (
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retry sync"
          >
            {syncStatus === 'syncing' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.retryText}>Sync Now</Text>
            )}
          </Pressable>
        )}

        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {isOnline
            ? 'Connection restored — tap to sync'
            : 'Waiting for connection…'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  icon: { fontSize: 64, marginBottom: Spacing.base },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  queueLabel: { fontSize: FontSize.base },
  queueCount: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
  },
  retryBtn: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    minWidth: 160,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  retryText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  pressed: { opacity: 0.75 },
  hint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
