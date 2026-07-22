/**
 * Badge — small pill label used for tags, status, unread counts.
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../theme/tokens';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primaryLight,   text: Colors.primaryDark  },
  success: { bg: Colors.successLight,   text: '#15803d'           },
  warning: { bg: Colors.warningLight,   text: '#92400e'           },
  error:   { bg: Colors.errorLight,     text: '#b91c1c'           },
  info:    { bg: Colors.infoLight,      text: '#1d4ed8'           },
  neutral: { bg: Colors.surfaceElevated, text: Colors.textSecondary },
};

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const { bg, text } = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
});
