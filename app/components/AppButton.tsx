import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'primary' ? styles.textLight : styles.textDark]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.orange600,
  },
  secondary: {
    backgroundColor: '#f3eee7',
    borderWidth: 1,
    borderColor: colors.border200,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: colors.ink700,
  },
});
