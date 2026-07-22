/**
 * Avatar — circular image with initials fallback.
 */

import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight } from '../../theme/tokens';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 40, style }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  const showImage = !!uri && !imgError;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      accessible
      accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setImgError(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={[styles.initials, { fontSize: size * 0.38 }]}
          allowFontScaling={false}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },
});
