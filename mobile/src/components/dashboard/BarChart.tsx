/**
 * BarChart — lightweight native bar chart with animated entrance.
 * No third-party chart library — pure RN Animated + View.
 * Renders in a single pass with no JS-driven layout recalculations.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { ChartDataPoint } from '../../types';
import { FontSize, FontWeight, Radius, Spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface BarChartProps {
  data: ChartDataPoint[];
  height?: number;
  barColor?: string;
  secondaryColor?: string;
  showValues?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function BarChart({
  data,
  height = 160,
  barColor,
  secondaryColor,
  showValues = false,
  style,
  accessibilityLabel,
}: BarChartProps) {
  const { colors } = useTheme();
  const fillColor = barColor ?? colors.primary;
  const secColor  = secondaryColor ?? colors.primaryLight;

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue ?? 0)), 1);

  // One animated value per bar
  const anims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: i * 60,
        useNativeDriver: false,
      }),
    );
    Animated.stagger(60, animations).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[styles.container, { height }, style]}
      accessible
      accessibilityLabel={accessibilityLabel ?? 'Bar chart'}
    >
      {/* Y-axis grid lines */}
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <View
          key={pct}
          style={[
            styles.gridLine,
            { bottom: pct * height, borderColor: colors.border },
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Bars */}
      <View style={styles.barsRow}>
        {data.map((point, i) => {
          const primaryPct  = point.value / maxValue;
          const secondaryPct = (point.secondaryValue ?? 0) / maxValue;

          return (
            <View key={i} style={styles.barGroup}>
              {/* Secondary bar (behind) */}
              {point.secondaryValue !== undefined && (
                <Animated.View
                  style={[
                    styles.bar,
                    styles.barSecondary,
                    {
                      backgroundColor: secColor,
                      height: anims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, secondaryPct * height * 0.9],
                      }),
                    },
                  ]}
                />
              )}
              {/* Primary bar */}
              <Animated.View
                style={[
                  styles.bar,
                  {
                    backgroundColor: fillColor,
                    height: anims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, primaryPct * height * 0.9],
                    }),
                    borderRadius: Radius.sm,
                  },
                ]}
              />
              {showValues && (
                <Text style={[styles.barValue, { color: colors.textTertiary }]}>
                  {point.value >= 1000
                    ? `${(point.value / 1000).toFixed(1)}k`
                    : String(point.value)}
                </Text>
              )}
              <Text style={[styles.barLabel, { color: colors.textTertiary }]} numberOfLines={1}>
                {point.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    paddingBottom: 20, // space for labels
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  bar: {
    width: '70%',
    minHeight: 2,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  barSecondary: {
    position: 'absolute',
    bottom: 20,
    opacity: 0.35,
    width: '70%',
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  barValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  barLabel: {
    fontSize: 9,
    position: 'absolute',
    bottom: 2,
    textAlign: 'center',
    width: '100%',
  },
});
