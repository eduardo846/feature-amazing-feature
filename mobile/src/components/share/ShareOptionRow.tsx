/**
 * ShareOptionRow — a single tappable share option with icon + label.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../../theme/tokens';

interface ShareOptionRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}

export function ShareOptionRow({
  icon,
  label,
  sublabel,
  onPress,
  disabled = false,
  variant = 'default',
}: ShareOptionRowProps) {
  const handlePress = useCallback(async () => {
    if (disabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onPress();
  }, [disabled, onPress]);

  const labelColor =
    variant === 'primary' ? Colors.primary :
    variant === 'danger'  ? Colors.error   :
    Colors.text;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={sublabel}
      accessibilityState={{ disabled }}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  rowPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  rowDisabled: {
    opacity: 0.4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  sublabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    fontSize: FontSize.xl,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
  },
});
