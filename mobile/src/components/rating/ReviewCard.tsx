/**
 * ReviewCard — displays a single review with helpful voting.
 */

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { StarRating } from '../ui/StarRating';
import { Divider } from '../ui/Divider';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../theme/tokens';
import { Review } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';

interface ReviewCardProps {
  review: Review;
  onHelpfulVote?: (reviewId: string, vote: 'helpful' | 'not_helpful') => void;
}

export function ReviewCard({ review, onHelpfulVote }: ReviewCardProps) {
  const { t, formatRelativeTime } = useI18n();
  const [localHelpful, setLocalHelpful] = useState(review.helpfulCount);
  const [voted, setVoted] = useState<'helpful' | 'not_helpful' | null>(null);

  const handleVote = useCallback(
    async (vote: 'helpful' | 'not_helpful') => {
      if (voted) return;
      await Haptics.selectionAsync();
      setVoted(vote);
      if (vote === 'helpful') setLocalHelpful((n) => n + 1);
      onHelpfulVote?.(review.id, vote);
    },
    [voted, review.id, onHelpfulVote],
  );

  return (
    <View style={styles.card} accessible accessibilityLabel={`Review by ${review.reviewerName}`}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar
          uri={review.reviewerAvatar}
          name={review.reviewerName}
          size={40}
        />
        <View style={styles.headerText}>
          <Text style={styles.reviewerName} numberOfLines={1}>
            {review.reviewerName}
          </Text>
          <Text style={styles.date}>
            {formatRelativeTime(new Date(review.createdAt))}
          </Text>
        </View>
        {review.isVerifiedPurchase && (
          <Badge label={t('rating.verifiedPurchase')} variant="success" />
        )}
      </View>

      {/* Stars */}
      <StarRating value={review.rating} size={16} style={styles.stars} />

      {/* Title */}
      <Text style={styles.title}>{review.title}</Text>

      {/* Body */}
      <Text style={styles.body}>{review.body}</Text>

      <Divider />

      {/* Helpful voting */}
      <View style={styles.footer}>
        <Text style={styles.helpfulLabel}>
          {localHelpful > 0
            ? t('rating.helpfulCount', { count: localHelpful })
            : ''}
        </Text>
        <View style={styles.voteRow}>
          <Pressable
            onPress={() => handleVote('helpful')}
            disabled={!!voted}
            style={({ pressed }) => [
              styles.voteBtn,
              voted === 'helpful' && styles.voteBtnActive,
              pressed && styles.voteBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('rating.helpful')}
            accessibilityState={{ selected: voted === 'helpful' }}
          >
            <Text style={[styles.voteBtnText, voted === 'helpful' && styles.voteBtnTextActive]}>
              👍 {t('rating.helpful')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleVote('not_helpful')}
            disabled={!!voted}
            style={({ pressed }) => [
              styles.voteBtn,
              voted === 'not_helpful' && styles.voteBtnActive,
              pressed && styles.voteBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('rating.notHelpful')}
            accessibilityState={{ selected: voted === 'not_helpful' }}
          >
            <Text style={[styles.voteBtnText, voted === 'not_helpful' && styles.voteBtnTextActive]}>
              👎 {t('rating.notHelpful')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  reviewerName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  stars: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  helpfulLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    flex: 1,
  },
  voteRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  voteBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  voteBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '33',
  },
  voteBtnPressed: {
    opacity: 0.7,
  },
  voteBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  voteBtnTextActive: {
    color: Colors.primaryDark,
  },
});
