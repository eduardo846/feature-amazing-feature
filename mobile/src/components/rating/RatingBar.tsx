/**
 * RatingBar — single row in the rating distribution breakdown.
 * Shows star label, animated fill bar, and count.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../theme/tokens';

interface RatingBarProps {
  stars: number;       // 1–5
  count: number;
  total: number;
  color?: string;
}

export function RatingBar({ stars, count, total, color = Colors.starFilled }: RatingBarProps) {
  const pct = total > 0 ? count / total : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 600,
      delay: (5 - stars) * 80, // stagger from top
      useNativeDriver: false,
    }).start();
  }, [pct, stars, widthAnim]);

  return (
    <View style={styles.row} accessible accessibilityLabel={`${stars} stars: ${count} reviews`}>
      <Text style={styles.label}>{stars}★</Text>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  label: {
    width: 32,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.starEmpty,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginHorizontal: Spacing.sm,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  count: {
    width: 32,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});
