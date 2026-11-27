import { useEffect } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing, useTheme } from '@/design';
import { useSoundPreference } from '@/lib/sound/sound-preference';

/**
 * Turns the short completion and celebration sounds on or off. Off removes nothing else:
 * every message a sound carries is also shown on screen. A device in silent mode stays silent.
 */
export function SoundSetting() {
  const { colors } = useTheme();
  const enabled = useSoundPreference((state) => state.enabled);
  const setEnabled = useSoundPreference((state) => state.setEnabled);
  const hydrate = useSoundPreference((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text variant="bodyStrong">Sound effects</Text>
        <Text variant="caption" color="textSecondary">
          Short sounds when you finish something. Silent mode stays silent.
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        aria-label="Sound effects"
        trackColor={{ true: colors.successCheck, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
