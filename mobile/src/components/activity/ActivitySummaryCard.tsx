/**
 * ActivitySummaryCard — weekly stats overview at the top of the timeline.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../../theme/tokens';
import { ActivitySummary } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';

interface ActivitySummaryCardProps {
  summary: ActivitySummary;
}

export function ActivitySummaryCard({ summary }: ActivitySummaryCardProps) {
  const { t, formatCurrency } = useI18n();

  const stats = [
    {
      label: t('activity.summaryTotal'),
      value: String(summary.totalEvents),
      icon: '📊',
    },
    {
      label: t('activity.summaryEarnings'),
      value: `${summary.weeklyEarnings.toFixed(0)} XLM`,
      icon: '💰',
    },
    {
      label: t('activity.summaryBounties'),
      value: String(summary.weeklyBounties),
      icon: '🏆',
    },
    {
      label: t('activity.unread'),
      value: String(summary.unreadCount),
      icon: '🔔',
    },
  ];

  return (
    <View style={styles.card} accessible accessibilityLabel={t('activity.summaryTitle')}>
      <Text style={styles.cardTitle}>
        {t('activity.summaryTitle')} · {t('activity.summaryThisWeek')}
      </Text>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCell}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.md,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryLight,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.primaryLight,
    textAlign: 'center',
    marginTop: 2,
  },
});
