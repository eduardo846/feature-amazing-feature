/**
 * ReviewForm — inline form for submitting a new review.
 * Validates: rating required, title 1–120 chars, body 1–2000 chars.
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StarRating } from '../ui/StarRating';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../../theme/tokens';
import { ReviewFormData } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => Promise<void>;
  onCancel?: () => void;
}

interface FormErrors {
  rating?: string;
  title?: string;
  body?: string;
}

export function ReviewForm({ onSubmit, onCancel }: ReviewFormProps) {
  const { t } = useI18n();
  const [rating, setRating]       = useState(0);
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [errors, setErrors]       = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};
    if (rating === 0)        errs.rating = t('rating.ratingRequired');
    if (!title.trim())       errs.title  = t('rating.titleRequired');
    if (title.length > 120)  errs.title  = t('rating.titleTooLong');
    if (!body.trim())        errs.body   = t('rating.bodyRequired');
    if (body.length > 2000)  errs.body   = t('rating.bodyTooLong');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [rating, title, body, t]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ rating, title: title.trim(), body: body.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSubmitting(false);
    }
  }, [validate, onSubmit, rating, title, body]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('rating.writeReview')}</Text>

      {/* Star picker */}
      <Text style={styles.fieldLabel}>{t('rating.yourRating')}</Text>
      <StarRating
        value={rating}
        size={36}
        interactive
        onChange={setRating}
        style={styles.starPicker}
        accessibilityLabel={t('rating.tapToRate')}
      />
      {errors.rating ? <Text style={styles.errorText}>{errors.rating}</Text> : null}

      {/* Title */}
      <Text style={styles.fieldLabel}>{t('rating.reviewTitle')}</Text>
      <TextInput
        style={[styles.input, errors.title ? styles.inputError : null]}
        placeholder={t('rating.reviewTitlePlaceholder')}
        placeholderTextColor={Colors.placeholder}
        value={title}
        onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }}
        maxLength={120}
        returnKeyType="next"
        accessibilityLabel={t('rating.reviewTitle')}
        accessibilityHint={t('rating.reviewTitlePlaceholder')}
      />
      {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

      {/* Body */}
      <Text style={styles.fieldLabel}>{t('rating.reviewBody')}</Text>
      <TextInput
        style={[styles.input, styles.textArea, errors.body ? styles.inputError : null]}
        placeholder={t('rating.reviewBodyPlaceholder')}
        placeholderTextColor={Colors.placeholder}
        value={body}
        onChangeText={(v) => { setBody(v); setErrors((e) => ({ ...e, body: undefined })); }}
        maxLength={2000}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        accessibilityLabel={t('rating.reviewBody')}
        accessibilityHint={t('rating.reviewBodyPlaceholder')}
      />
      <Text style={styles.charCount}>{body.length}/2000</Text>
      {errors.body ? <Text style={styles.errorText}>{errors.body}</Text> : null}

      {/* Actions */}
      <View style={styles.actions}>
        {onCancel && (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            submitting && styles.submitBtnDisabled,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('rating.submitReview')}
          accessibilityState={{ disabled: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>{t('rating.submitReview')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  starPicker: {
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputError: {
    borderColor: Colors.error,
  },
  textArea: {
    height: 120,
    paddingTop: Spacing.sm,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 2,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  submitBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    minWidth: 120,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSize.base,
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },
  btnPressed: {
    opacity: 0.75,
  },
});
