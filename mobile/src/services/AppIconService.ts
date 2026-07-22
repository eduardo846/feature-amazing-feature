import { Platform } from 'react-native';
import * as Application from 'expo-application';
import type { AppIconName } from '../types';

const ICON_NAME_BY_KEY: Record<AppIconName, string | null> = {
  default: null,
  aurora: 'AuroraIcon',
  midnight: 'MidnightIcon',
  forest: 'ForestIcon',
};

export async function supportsAppIconChangeAsync(): Promise<boolean> {
  if (Platform.OS !== 'ios' || typeof Application.supportsAlternateIconsAsync !== 'function') {
    return false;
  }
  return Application.supportsAlternateIconsAsync();
}

export async function getCurrentAppIconAsync(): Promise<AppIconName> {
  if (Platform.OS === 'ios' && typeof Application.getAlternateIconNameAsync === 'function') {
    const current = await Application.getAlternateIconNameAsync();
    return (Object.keys(ICON_NAME_BY_KEY) as AppIconName[]).find(
      (key) => ICON_NAME_BY_KEY[key] === current,
    ) ?? 'default';
  }
  return 'default';
}

export async function setAppIconAsync(icon: AppIconName): Promise<void> {
  if (Platform.OS !== 'ios' || typeof Application.supportsAlternateIconsAsync !== 'function') {
    return;
  }

  const supported = await supportsAppIconChangeAsync();
  if (!supported) {
    return;
  }

  const iconName = ICON_NAME_BY_KEY[icon];
  if (typeof Application.setAlternateIconNameAsync === 'function') {
    await Application.setAlternateIconNameAsync(iconName);
  }
}
