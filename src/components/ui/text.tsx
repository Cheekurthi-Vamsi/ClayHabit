import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useAppTheme, type ColorToken, type TypographyVariant } from '@/theme';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
}

export function Text({ variant = 'bodyMedium', color = 'textPrimary', style, ...rest }: TextProps) {
  const theme = useAppTheme();

  return (
    <RNText
      style={[theme.typography[variant], { color: theme.colors[color] }, style]}
      {...rest}
    />
  );
}
