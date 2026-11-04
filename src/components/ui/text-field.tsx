import { type ReactNode, type Ref, useId, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  View,
} from 'react-native';

import { layout, radius, spacing, typography, useTheme } from '@/design';

import { Icon } from './icon';
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
  multiline,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const descriptionId = useId();
  const hasError = Boolean(errorText);

  const borderColor = hasError ? colors.dangerIcon : isFocused ? colors.brand : colors.borderStrong;

  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          { backgroundColor: colors.surface, borderColor },
          // The outline doubles the border on focus without shifting the text.
          (isFocused || hasError) && { outlineColor: borderColor, outlineWidth: 1 },
        ]}>
        <TextInput
          ref={ref}
          aria-label={label}
          aria-describedby={helperText || errorText ? descriptionId : undefined}
          aria-invalid={hasError}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.brand}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
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
        <View style={styles.message}>
          <Icon name="error" size={16} color={colors.dangerIcon} />
          <Text
            nativeID={descriptionId}
            variant="bodySmall"
            color="danger"
            role="alert"
            style={styles.messageText}>
            {errorText}
          </Text>
        </View>
      ) : helperText ? (
        <Text nativeID={descriptionId} variant="bodySmall" color="textSecondary">
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
    minHeight: layout.fieldHeight,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  multiline: {
    minHeight: 112,
    alignItems: 'stretch',
  },
  input: {
    ...typography.body,
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xxs,
  },
  messageText: {
    flex: 1,
  },
});
