import { useEffect } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing, useTheme } from '@/design';
import { useSoundPreference } from '@/lib/sound/sound-preference';
import { useVibrationPreference } from '@/lib/vibration/vibration-preference';

type SwitchRowProps = {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

function SwitchRow({ label, description, enabled, onChange }: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" color="textSecondary">
          {description}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onChange}
        aria-label={label}
        trackColor={{ true: colors.successCheck, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

/**
 * Turns the short completion and celebration sounds on or off. Off removes nothing else:
 * every message a sound carries is also shown on screen. A device in silent mode stays silent.
 */
export function SoundSetting() {
  const enabled = useSoundPreference((state) => state.enabled);
  const setEnabled = useSoundPreference((state) => state.setEnabled);
  const hydrate = useSoundPreference((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SwitchRow
      label="Sound effects"
      description="Short sounds when you finish something. Silent mode stays silent."
      enabled={enabled}
      onChange={setEnabled}
    />
  );
}

/** Gentle haptics on completions. Off by default; it does nothing on the web. */
export function VibrationSetting() {
  const enabled = useVibrationPreference((state) => state.enabled);
  const setEnabled = useVibrationPreference((state) => state.setEnabled);
  const hydrate = useVibrationPreference((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SwitchRow
      label="Haptic feedback"
      description="A gentle tap when you finish something. Follows your phone's own haptics setting."
      enabled={enabled}
      onChange={setEnabled}
    />
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
