/**
 * RatingScreen
 *
 * Issue 1 — "Construct explicit highly robust native specific User rating
 * structures internally"
 *
 * Features:
 *  - Overall rating hero with animated score display
 *  - Animated per-star distribution bars
 *  - Sort (newest / highest / lowest / helpful) + filter by star count
 *  - Paginated review list (FlatList, no frame drops)
 *  - Inline ReviewForm with full validation
 *  - Haptic feedback on interactions
 *  - Full i18n via useI18n
 *  - Accessible (roles, labels, states)
 */

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StarRating } from '../components/ui/StarRating';
import { RatingBar } from '../components/rating/RatingBar';
import { ReviewCard } from '../components/rating/ReviewCard';
import { ReviewForm } from '../components/rating/ReviewForm';
import { EmptyState } from '../components/ui/EmptyState';
import { Divider } from '../components/ui/Divider';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
  STAR_COUNT,
} from '../theme/tokens';
import {
  RatingSummary,
  Review,
  ReviewFilterOption,
  ReviewFormData,
  ReviewSortOption,
} from '../types';
import { useI18n } from '../i18n/I18nProvider';

// ─── Mock data (replace with API call) ───────────────────────────────────────

const MOCK_SUMMARY: RatingSummary = {
  average: 4.3,
  totalCount: 128,
  distribution: { 5: 72, 4: 31, 3: 14, 2: 7, 1: 4 },
};

const MOCK_REVIEWS: Review[] = Array.from({ length: 12 }, (_, i) => ({
  id: `rev-${i}`,
  creatorId: 'creator-1',
  reviewerId: `user-${i}`,
  reviewerName: ['Alice Chen', 'Bob Martinez', 'Chloe Kim', 'David Osei', 'Eva Müller'][i % 5],
  reviewerAvatar: undefined,
  rating: [5, 4, 5, 3, 4, 5, 2, 4, 5, 4, 3, 5][i],
  title: ['Exceptional work!', 'Great collaboration', 'Highly recommend', 'Good but slow', 'Outstanding quality'][i % 5],
  body: 'The creator delivered exactly what was promised, on time and with excellent communication throughout the project. Would definitely work with them again.',
  isVerifiedPurchase: i % 3 === 0,
  helpfulCount: Math.floor(Math.random() * 20),
  notHelpfulCount: Math.floor(Math.random() * 3),
  status: 'APPROVED' as const,
  createdAt: new Date(Date.now() - i * 86_400_000 * 3).toISOString(),
  updatedAt: new Date(Date.now() - i * 86_400_000 * 3).toISOString(),
}));

// ─── Sort / filter helpers ────────────────────────────────────────────────────

function sortReviews(reviews: Review[], sort: ReviewSortOption): Review[] {
  return [...reviews].sort((a, b) => {
    switch (sort) {
      case 'newest':  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'highest': return b.rating - a.rating;
      case 'lowest':  return a.rating - b.rating;
      case 'helpful': return b.helpfulCount - a.helpfulCount;
    }
  });
}

function filterReviews(reviews: Review[], filter: ReviewFilterOption): Review[] {
  if (filter === 0) return reviews;
  return reviews.filter((r) => r.rating === filter);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RatingScreenProps {
  creatorId?: string;
  creatorName?: string;
}

export function RatingScreen({ creatorName = 'Creator' }: RatingScreenProps) {
  const { t } = useI18n();

  const [summary]                   = useState<RatingSummary>(MOCK_SUMMARY);
  const [allReviews]                = useState<Review[]>(MOCK_REVIEWS);
  const [sort, setSort]             = useState<ReviewSortOption>('newest');
  const [filter, setFilter]         = useState<ReviewFilterOption>(0);
  const [showForm, setShowForm]     = useState(false);
  const [page, setPage]             = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 6;

  const processed = useMemo(
    () => sortReviews(filterReviews(allReviews, filter), sort),
    [allReviews, sort, filter],
  );

  const visible = useMemo(() => processed.slice(0, page * PAGE_SIZE), [processed, page]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || visible.length >= processed.length) return;
    setLoadingMore(true);
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 600));
    setPage((p) => p + 1);
    setLoadingMore(false);
  }, [loadingMore, visible.length, processed.length]);

  const handleSortChange = useCallback(async (s: ReviewSortOption) => {
    await Haptics.selectionAsync();
    setSort(s);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback(async (f: ReviewFilterOption) => {
    await Haptics.selectionAsync();
    setFilter(f);
    setPage(1);
  }, []);

  const handleSubmitReview = useCallback(async (_data: ReviewFormData) => {
    // In production: POST /api/reviews
    await new Promise((r) => setTimeout(r, 800));
    setShowForm(false);
    Alert.alert('', t('rating.reviewSubmitted'));
  }, [t]);

  // ── Sort chips ──────────────────────────────────────────────────────────────

  const SORT_OPTIONS: { key: ReviewSortOption; label: string }[] = [
    { key: 'newest',  label: t('rating.sortNewest')      },
    { key: 'highest', label: t('rating.sortHighest')     },
    { key: 'lowest',  label: t('rating.sortLowest')      },
    { key: 'helpful', label: t('rating.sortMostHelpful') },
  ];

  const FILTER_OPTIONS: { key: ReviewFilterOption; label: string }[] = [
    { key: 0, label: t('rating.allRatings') },
    { key: 5, label: '5★' },
    { key: 4, label: '4★' },
    { key: 3, label: '3★' },
    { key: 2, label: '2★' },
    { key: 1, label: '1★' },
  ];

  // ── FlatList header ─────────────────────────────────────────────────────────

  const ListHeader = useMemo(() => (
    <View>
      {/* Hero summary card */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroScore} accessibilityLabel={`${summary.average.toFixed(1)} out of 5`}>
            {summary.average.toFixed(1)}
          </Text>
          <Text style={styles.heroOutOf}>{t('rating.outOf')}</Text>
          <StarRating value={summary.average} size={20} style={styles.heroStars} />
          <Text style={styles.heroCount}>
            {t('rating.totalReviews', { count: summary.totalCount })}
          </Text>
        </View>
        <View style={styles.heroRight}>
          {([5, 4, 3, 2, 1] as const).map((star) => (
            <RatingBar
              key={star}
              stars={star}
              count={summary.distribution[star]}
              total={summary.totalCount}
            />
          ))}
        </View>
      </View>

      {/* Write review button */}
      {!showForm && (
        <Pressable
          onPress={() => { setShowForm(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={({ pressed }) => [styles.writeBtn, pressed && styles.writeBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('rating.writeReview')}
        >
          <Text style={styles.writeBtnText}>✏️  {t('rating.writeReview')}</Text>
        </Pressable>
      )}

      {/* Inline form */}
      {showForm && (
        <View style={styles.formWrapper}>
          <ReviewForm
            onSubmit={handleSubmitReview}
            onCancel={() => setShowForm(false)}
          />
        </View>
      )}

      <Divider style={styles.divider} />

      {/* Sort chips */}
      <Text style={styles.sectionLabel}>{t('rating.sortBy')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => handleSortChange(opt.key)}
            style={[styles.chip, sort === opt.key && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: sort === opt.key }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.chipText, sort === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Filter chips */}
      <Text style={styles.sectionLabel}>{t('rating.filterByStars')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => handleFilterChange(opt.key)}
            style={[styles.chip, filter === opt.key && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === opt.key }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.chipText, filter === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Divider style={styles.divider} />
      <Text style={styles.sectionLabel}>{t('rating.recentReviews')}</Text>
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [summary, showForm, sort, filter, t]);

  const renderItem: ListRenderItem<Review> = useCallback(
    ({ item }) => <ReviewCard review={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Review) => item.id, []);

  const ListFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingMoreText}>{t('activity.loadingMore')}</Text>
        </View>
      );
    }
    if (visible.length < processed.length) {
      return (
        <Pressable
          onPress={handleLoadMore}
          style={({ pressed }) => [styles.loadMoreBtn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('activity.loadMore')}
        >
          <Text style={styles.loadMoreText}>{t('activity.loadMore')}</Text>
        </Pressable>
      );
    }
    return null;
  }, [loadingMore, visible.length, processed.length, handleLoadMore, t]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t('rating.screenTitle')}</Text>
        <Text style={styles.creatorName}>{creatorName}</Text>
      </View>
      <FlatList
        data={visible}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <EmptyState
            icon="⭐"
            title={t('rating.noReviews')}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={6}
        windowSize={10}
        initialNumToRender={6}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  screenTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  creatorName: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.md,
    gap: Spacing.base,
  },
  heroLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  heroScore: {
    fontSize: FontSize['5xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    lineHeight: FontSize['5xl'] * 1.1,
  },
  heroOutOf: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  heroStars: {
    marginBottom: Spacing.xs,
  },
  heroCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  heroRight: {
    flex: 1,
    justifyContent: 'center',
  },
  writeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  writeBtnPressed: { opacity: 0.8 },
  writeBtnText: {
    color: Colors.textInverse,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  formWrapper: {
    marginBottom: Spacing.md,
  },
  divider: {
    marginVertical: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  chipScroll: {
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
    backgroundColor: Colors.background,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.textInverse,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  loadingMoreText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loadMoreText: {
    fontSize: FontSize.base,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  btnPressed: { opacity: 0.7 },
});
