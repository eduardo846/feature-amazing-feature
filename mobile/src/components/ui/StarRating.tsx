/**
 * StarRating — interactive or display-only star row.
 *
 * Props:
 *   value        current rating (0–5, supports half-stars in display mode)
 *   maxStars     defaults to 5
 *   size         star diameter in px
 *   interactive  if true, tapping a star updates the value
 *   onChange     called with new integer rating when interactive
 *   color        filled star colour
 *   emptyColor   empty star colour
 *   accessibilityLabel  override for screen readers
 */

import React, { useCallback } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, STAR_COUNT } from '../../theme/tokens';

interface StarRatingProps {
  value: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  color?: string;
  emptyColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function StarRating({
  value,
  maxStars = STAR_COUNT,
  size = 24,
  interactive = false,
  onChange,
  color = Colors.starFilled,
  emptyColor = Colors.starEmpty,
  style,
  accessibilityLabel,
}: StarRatingProps) {
  const handlePress = useCallback(
    (index: number) => {
      if (!interactive || !onChange) return;
      const newRating = index + 1;
      onChange(newRating);
      AccessibilityInfo.announceForAccessibility(`${newRating} star${newRating !== 1 ? 's' : ''}`);
    },
    [interactive, onChange],
  );

  return (
    <View
      style={[styles.row, style]}
      accessible={!interactive}
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ??
        `${value.toFixed(1)} out of ${maxStars} stars`
      }
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = value >= i + 1;
        const half   = !filled && value >= i + 0.5;

        return (
          <Pressable
            key={i}
            onPress={() => handlePress(i)}
            disabled={!interactive}
            accessible={interactive}
            accessibilityRole={interactive ? 'button' : undefined}
            accessibilityLabel={interactive ? `Rate ${i + 1} star${i !== 0 ? 's' : ''}` : undefined}
            hitSlop={interactive ? { top: 8, bottom: 8, left: 4, right: 4 } : undefined}
            style={({ pressed }) => [
              styles.star,
              interactive && pressed && styles.starPressed,
            ]}
          >
            <StarShape
              size={size}
              filled={filled}
              half={half}
              color={color}
              emptyColor={emptyColor}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── SVG-free star drawn with border trick ────────────────────────────────────

interface StarShapeProps {
  size: number;
  filled: boolean;
  half: boolean;
  color: string;
  emptyColor: string;
}

function StarShape({ size, filled, half, color, emptyColor }: StarShapeProps) {
  // Unicode star — fast, no SVG dependency, accessible
  const char = filled ? '★' : half ? '⯨' : '☆';
  const fill = filled || half ? color : emptyColor;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <View style={{ fontSize: size, lineHeight: size }}>
        {/* Using Text inside View for proper sizing */}
        <StarText char={char} size={size} color={fill} />
      </View>
    </View>
  );
}

import { Text } from 'react-native';

function StarText({ char, size, color }: { char: string; size: number; color: string }) {
  return (
    <Text
      style={{ fontSize: size * 0.9, color, lineHeight: size, includeFontPadding: false }}
      allowFontScaling={false}
    >
      {char}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
});
