import * as Haptics from 'expo-haptics';

import { usePreferencesStore } from '../store/preferencesStore';

/** Light tap for primary button presses and similar UI selections. */
export function playSelectionFeedback(): void {
  if (!usePreferencesStore.getState().hapticsEnabled) {
    return;
  }
  void Haptics.selectionAsync().catch(() => undefined);
}

/** Success cue after park / leave / similar completions. */
export function playSuccessFeedback(): void {
  const { hapticsEnabled, soundCuesEnabled } = usePreferencesStore.getState();
  if (hapticsEnabled) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }
  if (soundCuesEnabled) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
  }
}

/** Error cue when an action fails. */
export function playErrorFeedback(): void {
  const { hapticsEnabled, soundCuesEnabled } = usePreferencesStore.getState();
  if (hapticsEnabled) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }
  if (soundCuesEnabled) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => undefined,
    );
  }
}
