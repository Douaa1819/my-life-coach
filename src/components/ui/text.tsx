import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';

import { type ColorTokens, typography, type TypographyVariant, useTheme } from '@/design';

export type TextProps = NativeTextProps & {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  align?: 'auto' | 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <NativeText
      style={[typography[variant], { color: colors[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
