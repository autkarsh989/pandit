import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

export default function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#f3e7d8',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink700,
  },
});
