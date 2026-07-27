// Блок подробной информации о карточке культуры.
import { StyleSheet, Text, View } from 'react-native';
import CardStatusLine from './CardStatusLine';

function MetaItem({ accessibilityLabel, icon, value, width }) {
  return (
    <View
      accessibilityLabel={accessibilityLabel || value}
      accessible
      style={[styles.metaItem, width ? { width } : null]}
    >
      {icon}
      <Text style={styles.metaValue}>
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
            accessibilityLabel={item.accessibilityLabel}
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
          accessibilityLabel={status.accessibilityLabel}
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
    rowGap: 8,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    maxWidth: '100%',
  },
  metaValue: {
    color: '#6B7280',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
});
