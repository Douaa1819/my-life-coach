/**
 * react-native-web's Alert.alert does nothing, so on web the confirmation uses
 * the browser's own dialog. Same contract as the native version.
 */
export function confirmGoalChange(options: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  if (window.confirm(`${options.title}\n\n${options.message}`)) {
    options.onConfirm();
  }
}
