// Заголовок экрана стадии с кнопкой возврата.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';
import { ArrowBackIcon } from './icons';

export default function StageHeader({
  action,
  children,
  onBack,
  subtitle,
  title,
}) {
  return (
    <View style={styles.header}>
      <View style={[styles.headerRow, children && styles.headerRowWithChildren]}>
        {onBack && (
          <Pressable
            accessibilityLabel="Назад"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && appStyles.linkButtonPressed,
            ]}
          >
            <ArrowBackIcon size={22} />
          </Pressable>
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle}
        </View>

        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
    zIndex: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
  },
  headerRowWithChildren: {
    marginBottom: 14,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    marginLeft: -14,
    width: 48,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
});
