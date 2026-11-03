import { type ReactNode, type Ref, useId, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  View,
} from 'react-native';

import { layout, radius, spacing, typography, useTheme } from '@/design';

import { Text } from './text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  helperText?: string;
  errorText?: string;
  /** Rendered inside the field after the input, e.g. a visibility toggle. */
  trailing?: ReactNode;
  ref?: Ref<TextInputInstance>;
};

export function TextField({
  label,
  helperText,
  errorText,
  trailing,
  ref,
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
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor }]}>
        <TextInput
          ref={ref}
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
          style={[styles.input, { color: colors.text }]}
          {...inputProps}
        />
        {trailing}
      </View>
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget + 4,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
