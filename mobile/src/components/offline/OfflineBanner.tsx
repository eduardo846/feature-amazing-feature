/**
 * OfflineBanner — persistent top bar shown when the device is offline.
 * Animates in/out smoothly. Shows sync status when reconnecting.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNetwork } from '../../offline/NetworkProvider';
import { BrandColors, FontSize, FontWeight, Spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

export function OfflineBanner() {
  const { isOnline, syncStatus, pendingOpsCount } = useNetwork();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const visible = !isOnline || syncStatus === 'syncing';

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-48, 0],
  });

  const bgColor =
    syncStatus === 'syncing' ? BrandColors.info :
    syncStatus === 'error'   ? BrandColors.error :
    BrandColors.warning;

  const message =
    syncStatus === 'syncing'
      ? `Syncing ${pendingOpsCount} pending change${pendingOpsCount !== 1 ? 's' : ''}…`
      : syncStatus === 'error'
      ? 'Sync failed — will retry when online'
      : `You're offline${pendingOpsCount > 0 ? ` · ${pendingOpsCount} change${pendingOpsCount !== 1 ? 's' : ''} queued` : ''}`;

  return (
    <Animated.View
      style={[styles.banner, { backgroundColor: bgColor, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      pointerEvents="none"
    >
      <Text style={styles.icon}>
        {syncStatus === 'syncing' ? '🔄' : syncStatus === 'error' ? '⚠️' : '📡'}
      </Text>
      <Text style={styles.text} numberOfLines={1}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
    zIndex: 9999,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#ffffff',
  },
});
