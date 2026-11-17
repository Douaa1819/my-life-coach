import { Alert } from 'react-native';

export function confirmGoalChange(options: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  Alert.alert(options.title, options.message, [
    { text: 'Keep it', style: 'cancel' },
    {
      text: options.confirmLabel,
      style: options.destructive ? 'destructive' : 'default',
      onPress: options.onConfirm,
    },
  ]);
}
