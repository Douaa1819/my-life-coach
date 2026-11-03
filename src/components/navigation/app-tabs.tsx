import { NativeTabs } from 'expo-router/native-tabs';

import { iconMap } from '@/components/ui/icon';
import { useTheme } from '@/design';

import { tabRoutes } from './tab-routes';

export function AppTabs() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.primaryContainer}
      iconColor={{ default: colors.textSecondary, selected: colors.onPrimaryContainer }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.text },
      }}
      rippleColor={colors.ripple}>
      {tabRoutes.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={iconMap[tab.icon].ios} md={iconMap[tab.icon].android} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
