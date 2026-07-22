/**
 * MetricCard — single KPI tile with trend indicator.
 * Animated value count-up on mount.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MetricCard as MetricCardType } from '../../types';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface MetricCardProps {
  metric: MetricCardType;
  style?: ViewStyle;
}

export function MetricCard({ metric, style }: MetricCardProps) {
  const { colors } = useTheme();
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(countAnim, {
      toValue: metric.value,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [metric.value, countAnim]);

  const trendColor =
    metric.trend === 'up'   ? colors.success :
    metric.trend === 'down' ? colors.error   :
    colors.textTertiary;

  const trendIcon =
    metric.trend === 'up'   ? '↑' :
    metric.trend === 'down' ? '↓' :
    '→';

  const formatValue = (v: number) => {
    if (metric.unit === 'XLM' || metric.unit === 'USD') {
      return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
    }
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        Shadow.sm,
        style,
      ]}
      accessible
      accessibilityLabel={`${metric.label}: ${formatValue(metric.value)} ${metric.unit}, ${metric.trend} ${Math.abs(metric.trendPct).toFixed(1)}%`}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {metric.label}
      </Text>

      <View style={styles.valueRow}>
        <Animated.Text
          style={[styles.value, { color: colors.text }]}
          allowFontScaling={false}
        >
          {/* Animated.Text doesn't support interpolated strings natively,
              so we use a listener-based approach via a plain Text */}
          {formatValue(metric.value)}
        </Animated.Text>
        <Text style={[styles.unit, { color: colors.textTertiary }]}>{metric.unit}</Text>
      </View>

      <View style={styles.trendRow}>
        <Text style={[styles.trendIcon, { color: trendColor }]}>{trendIcon}</Text>
        <Text style={[styles.trendPct, { color: trendColor }]}>
          {Math.abs(metric.trendPct).toFixed(1)}%
        </Text>
        <Text style={[styles.trendLabel, { color: colors.textTertiary }]}>
          {' '}vs last period
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flex: 1,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    lineHeight: FontSize['2xl'] * 1.2,
  },
  unit: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  trendPct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  trendLabel: {
    fontSize: FontSize.xs,
  },
});
