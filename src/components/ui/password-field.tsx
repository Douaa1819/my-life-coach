import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { layout, useTheme } from '@/design';

import { Icon } from './icon';
import { TextField, type TextFieldProps } from './text-field';

type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'trailing'> & {
  /** "new-password" lets password managers offer a generated password. */
  purpose: 'current' | 'new';
};

export function PasswordField({ purpose, ...props }: PasswordFieldProps) {
  const { colors } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      {...props}
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoComplete={purpose === 'new' ? 'new-password' : 'current-password'}
      textContentType={purpose === 'new' ? 'newPassword' : 'password'}
      trailing={
        <Pressable
          role="button"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          onPress={() => setIsVisible((visible) => !visible)}
          hitSlop={4}
          android_ripple={{ color: colors.ripple, borderless: true, radius: 22 }}
          style={styles.toggle}>
          <Icon name={isVisible ? 'hidden' : 'visible'} size={20} color={colors.textSecondary} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
