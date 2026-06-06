// Строка отображения статуса или метаданных карточки.
import { StyleSheet, Text, View } from 'react-native';

export default function CardStatusLine({
  icon,
  text,
  textStyle,
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        {icon}
      </View>
      <Text numberOfLines={1} style={[styles.text, textStyle]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
});
