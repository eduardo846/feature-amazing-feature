/**
 * ActivityEventItem — single row in the activity timeline.
 * Left-side coloured dot + connector line, icon, title, subtitle, time.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../../theme/tokens';
import { ActivityEvent, ActivityEventType } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';

// ─── Event metadata ───────────────────────────────────────────────────────────

const EVENT_META: Record<
  ActivityEventType,
  { icon: string; color: string; i18nKey: string }
> = {
  bounty_posted:     { icon: '📋', color: Colors.eventBounty,  i18nKey: 'activity.eventBountyPosted'    },
  bounty_applied:    { icon: '📨', color: Colors.eventBounty,  i18nKey: 'activity.eventBountyApplied'   },
  bounty_accepted:   { icon: '✅', color: Colors.success,      i18nKey: 'activity.eventBountyAccepted'  },
  bounty_rejected:   { icon: '❌', color: Colors.error,        i18nKey: 'activity.eventBountyRejected'  },
  bounty_completed:  { icon: '🏆', color: Colors.accent,       i18nKey: 'activity.eventBountyCompleted' },
  review_received:   { icon: '⭐', color: Colors.eventReview,  i18nKey: 'activity.eventReviewReceived'  },
  review_left:       { icon: '✍️', color: Colors.eventReview,  i18nKey: 'activity.eventReviewLeft'      },
  payment_received:  { icon: '💰', color: Colors.eventPayment, i18nKey: 'activity.eventPaymentReceived' },
  payment_sent:      { icon: '💸', color: Colors.eventPayment, i18nKey: 'activity.eventPaymentSent'     },
  message_received:  { icon: '💬', color: Colors.eventMessage, i18nKey: 'activity.eventMessageReceived' },
  profile_viewed:    { icon: '👁️', color: Colors.eventProfile, i18nKey: 'activity.eventProfileViewed'   },
  match_found:       { icon: '🔗', color: Colors.eventMatch,   i18nKey: 'activity.eventMatchFound'      },
  dispute_opened:    { icon: '⚠️', color: Colors.eventDispute, i18nKey: 'activity.eventDisputeOpened'   },
  dispute_resolved:  { icon: '🤝', color: Colors.success,      i18nKey: 'activity.eventDisputeResolved' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ActivityEventItemProps {
  event: ActivityEvent;
  isLast?: boolean;
  onPress?: (event: ActivityEvent) => void;
}

export function ActivityEventItem({ event, isLast = false, onPress }: ActivityEventItemProps) {
  const { t, formatRelativeTime } = useI18n();
  const meta = EVENT_META[event.type];

  const handlePress = useCallback(async () => {
    await Haptics.selectionAsync();
    onPress?.(event);
  }, [event, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${t(meta.i18nKey)}${event.relatedName ? `: ${event.relatedName}` : ''}`}
      accessibilityState={{ checked: event.read }}
    >
      {/* Timeline spine */}
      <View style={styles.spine}>
        <View style={[styles.dot, { backgroundColor: meta.color }]}>
          <Text style={styles.dotIcon}>{meta.icon}</Text>
        </View>
        {!isLast && <View style={styles.connector} />}
      </View>

      {/* Content */}
      <View style={[styles.content, isLast && styles.contentLast]}>
        <View style={styles.contentHeader}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !event.read && styles.titleUnread]} numberOfLines={2}>
              {t(meta.i18nKey)}
              {event.relatedName ? ` — ${event.relatedName}` : ''}
            </Text>
            {!event.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.time}>
            {formatRelativeTime(new Date(event.createdAt))}
          </Text>
        </View>

        {event.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>{event.subtitle}</Text>
        ) : null}

        {event.amount !== undefined && (
          <Badge
            label={t('activity.amount', { amount: event.amount.toFixed(2) })}
            variant={event.type === 'payment_received' ? 'success' : 'neutral'}
            style={styles.amountBadge}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingRight: Spacing.base,
  },
  rowPressed: {
    opacity: 0.75,
  },
  spine: {
    width: 48,
    alignItems: 'center',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotIcon: {
    fontSize: 16,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 2,
    marginBottom: 0,
    minHeight: 16,
  },
  content: {
    flex: 1,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  contentLast: {
    paddingBottom: Spacing.sm,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.regular,
    lineHeight: 20,
  },
  titleUnread: {
    color: Colors.text,
    fontWeight: FontWeight.semibold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    flexShrink: 0,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
    lineHeight: 18,
  },
  amountBadge: {
    marginTop: Spacing.xs,
  },
});
