// Блок подробной информации о карточке культуры.
import { StyleSheet, Text, View } from 'react-native';
import CardStatusLine from './CardStatusLine';

function MetaItem({ icon, value, width }) {
  return (
    <View style={[styles.metaItem, width ? { width } : null]}>
      {icon}
      <Text numberOfLines={1} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

export default function CultureCardInfo({
  meta,
  statuses,
}) {
  return (
    <View>
      <View style={styles.metaGrid}>
        {meta.map((item) => (
          <MetaItem
            icon={item.icon}
            key={item.key}
            value={item.value}
            width={item.width}
          />
        ))}
      </View>

      {statuses.map((status) => (
        <CardStatusLine
          icon={status.icon}
          key={status.key}
          text={status.text}
          textStyle={status.textStyle}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metaGrid: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
  },
  metaValue: {
    color: '#6B7280',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
});
