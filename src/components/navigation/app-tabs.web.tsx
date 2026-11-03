import { TabList, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { layout, radius, spacing, useTheme } from '@/design';

import { tabRoutes } from './tab-routes';

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  icon: (typeof tabRoutes)[number]['icon'];
};

function TabButton({ label, icon, isFocused, ref, ...props }: TabButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      ref={ref as ComponentProps<typeof Pressable>['ref']}
      {...props}
      aria-label={label}
      style={[styles.tab, isFocused && { backgroundColor: colors.primaryContainer }]}>
      <Icon
        name={icon}
        size={20}
        color={isFocused ? colors.onPrimaryContainer : colors.textSecondary}
      />
      <Text variant="caption" color={isFocused ? 'text' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Native tabs have no web tab bar, so web uses headless tabs with the same routes. */
export function AppTabs() {
  const { colors } = useTheme();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View
          style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {tabRoutes.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    minWidth: 72,
    minHeight: layout.minTouchTarget + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
});
