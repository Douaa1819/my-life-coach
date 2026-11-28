import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Button, InlineMessage, PillGroup, Text } from '@/components/ui';
import { spacing, useTheme } from '@/design';

import {
  type ReminderPreferences,
  type ReminderType,
  eveningTimes,
  morningTimes,
  quietEnds,
  quietStarts,
  reminderTypeLabels,
  reminderTypes,
} from '../notification.schema';
import { requestReminderPermission, remindersSupported, syncReminders } from '../reminder-service';
import { timeInWindow } from '../schedule';
import { useReminderPreferences, useSaveReminderPreferences } from '../use-notifications';

const OFF = 'off';
const STARTER_MORNING = '09:00';
const STARTER_EVENING = '20:00';
const STARTER_TYPES: ReminderType[] = ['morning_plan', 'evening_checkin'];

type Notice = { tone: 'info' | 'danger'; message: string; openSettings?: boolean };

/**
 * Gentle reminders. Off until the person turns them on and the phone agrees; the switch is
 * the only thing that asks for permission. Quiet hours and the two-a-day limit are shown
 * plainly, and turning the switch off cancels everything that was scheduled.
 */
export function RemindersSetting() {
  const { colors } = useTheme();
  const preferences = useReminderPreferences();
  const save = useSaveReminderPreferences();
  const [notice, setNotice] = useState<Notice>();

  if (!remindersSupported) {
    return (
      <View style={styles.stack}>
        <Text variant="bodyStrong">Gentle reminders</Text>
        <Text variant="caption" color="textSecondary">
          Reminders are available in the mobile app.
        </Text>
      </View>
    );
  }

  if (!preferences.data) return null;
  const prefs = preferences.data;

  async function update(change: Partial<ReminderPreferences>, askedPermission = false) {
    const next = { ...prefs, ...change };
    try {
      const saved = await save.mutateAsync({
        enabled: next.enabled,
        morningTime: next.morningTime,
        eveningTime: next.eveningTime,
        quietStart: next.quietStart,
        quietEnd: next.quietEnd,
        types: next.types,
        ...(askedPermission ? { permissionAskedAt: new Date().toISOString() } : {}),
      });
      await syncReminders(saved);
      return true;
    } catch {
      setNotice({ tone: 'danger', message: "We couldn't save that. Please try again." });
      return false;
    }
  }

  async function toggle(enabled: boolean) {
    setNotice(undefined);
    if (!enabled) {
      await update({ enabled: false });
      return;
    }
    const permission = await requestReminderPermission();
    if (permission !== 'granted') {
      setNotice(
        permission === 'blocked'
          ? {
              tone: 'info',
              message:
                'Reminders are switched off in your phone settings. You can turn them on there.',
              openSettings: true,
            }
          : { tone: 'info', message: 'No problem. Reminders stay off.' },
      );
      await update({ enabled: false }, true);
      return;
    }
    const starting = prefs.types.length === 0;
    await update(
      {
        enabled: true,
        ...(starting
          ? {
              types: STARTER_TYPES,
              morningTime: prefs.morningTime ?? STARTER_MORNING,
              eveningTime: prefs.eveningTime ?? STARTER_EVENING,
            }
          : {}),
      },
      true,
    );
  }

  function toggleType(type: ReminderType, on: boolean) {
    setNotice(undefined);
    const types = on ? [...prefs.types, type] : prefs.types.filter((value) => value !== type);
    void update({ types });
  }

  function chooseTime(field: 'morningTime' | 'eveningTime', value: string) {
    setNotice(undefined);
    void update({ [field]: value === OFF ? null : value });
  }

  function chooseQuiet(field: 'quietStart' | 'quietEnd', value: string) {
    const quietStart = field === 'quietStart' ? value : prefs.quietStart;
    const quietEnd = field === 'quietEnd' ? value : prefs.quietEnd;
    const clash = [prefs.morningTime, prefs.eveningTime].some(
      (time) => time !== null && timeInWindow(time, quietStart, quietEnd),
    );
    if (clash) {
      setNotice({
        tone: 'info',
        message: 'A reminder time would fall inside those quiet hours. Move that reminder first.',
      });
      return;
    }
    setNotice(undefined);
    void update({ [field]: value });
  }

  const timeOptions = (times: readonly string[]) => [
    { value: OFF, label: 'Off' },
    ...times
      .filter((time) => !timeInWindow(time, prefs.quietStart, prefs.quietEnd))
      .map((time) => ({ value: time, label: time })),
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text variant="bodyStrong">Gentle reminders</Text>
          <Text variant="caption" color="textSecondary">
            Off unless you want them. Never in quiet hours, and at most two a day.
          </Text>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={(value) => void toggle(value)}
          aria-label="Gentle reminders"
          trackColor={{ true: colors.successCheck, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>

      {notice && <InlineMessage tone={notice.tone} message={notice.message} />}
      {notice?.openSettings && (
        <Button
          label="Open phone settings"
          variant="tonal"
          onPress={() => void Linking.openSettings()}
        />
      )}

      {prefs.enabled && (
        <View style={styles.stack}>
          {reminderTypes.map((type) => (
            <View key={type} style={styles.row}>
              <View style={styles.copy}>
                <Text variant="bodySmall" style={{ color: colors.text }}>
                  {reminderTypeLabels[type].title}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {reminderTypeLabels[type].hint}
                </Text>
              </View>
              <Switch
                value={prefs.types.includes(type)}
                onValueChange={(value) => toggleType(type, value)}
                aria-label={reminderTypeLabels[type].title}
                trackColor={{ true: colors.successCheck, false: colors.border }}
                thumbColor={colors.surface}
              />
            </View>
          ))}
          <PillGroup
            label="Morning time"
            options={timeOptions(morningTimes)}
            selected={prefs.morningTime ?? OFF}
            onSelect={(value) => chooseTime('morningTime', value)}
          />
          <PillGroup
            label="Evening time"
            options={timeOptions(eveningTimes)}
            selected={prefs.eveningTime ?? OFF}
            onSelect={(value) => chooseTime('eveningTime', value)}
          />
          <PillGroup
            label="Quiet from"
            options={quietStarts.map((time) => ({ value: time, label: time }))}
            selected={prefs.quietStart}
            onSelect={(value) => chooseQuiet('quietStart', value)}
          />
          <PillGroup
            label="Quiet until"
            options={quietEnds.map((time) => ({ value: time, label: time }))}
            selected={prefs.quietEnd}
            onSelect={(value) => chooseQuiet('quietEnd', value)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
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
