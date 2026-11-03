import { useId, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { layout, radius, spacing, typography, useTheme } from '@/design';

import { Text } from './text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  helperText?: string;
  errorText?: string;
};

export function TextField({
  label,
  helperText,
  errorText,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const descriptionId = useId();
  const hasError = Boolean(errorText);

  const borderColor = hasError ? colors.danger : isFocused ? colors.primary : colors.border;

  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <TextInput
        aria-label={label}
        aria-describedby={helperText || errorText ? descriptionId : undefined}
        aria-invalid={hasError}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor,
          },
        ]}
        {...inputProps}
      />
      {hasError ? (
        <Text nativeID={descriptionId} variant="caption" color="danger" role="alert">
          {errorText}
        </Text>
      ) : helperText ? (
        <Text nativeID={descriptionId} variant="caption" color="textSecondary">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    minHeight: layout.minTouchTarget + 4,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
