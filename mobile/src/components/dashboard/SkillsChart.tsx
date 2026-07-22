/**
 * SkillsChart — horizontal bar chart for top skills breakdown.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { FontSize, FontWeight, Radius, Spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

interface SkillsChartProps {
  skills: Array<{ skill: string; count: number }>;
}

export function SkillsChart({ skills }: SkillsChartProps) {
  const { colors } = useTheme();
  const maxCount = Math.max(...skills.map((s) => s.count), 1);
  const anims = useRef(skills.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      80,
      anims.map((a, i) =>
        Animated.timing(a, {
          toValue: skills[i].count / maxCount,
          duration: 500,
          delay: i * 60,
          useNativeDriver: false,
        }),
      ),
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View accessible accessibilityLabel="Top skills chart">
      {skills.map((item, i) => (
        <View key={item.skill} style={styles.row}>
          <Text style={[styles.skillLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.skill}
          </Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceElevated }]}>
            <Animated.View
              style={[
                styles.fill,
                {
                  backgroundColor: colors.primary,
                  width: anims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={[styles.count, { color: colors.textTertiary }]}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  skillLabel: {
    width: 90,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  count: {
    width: 28,
    fontSize: FontSize.sm,
    textAlign: 'right',
  },
});
