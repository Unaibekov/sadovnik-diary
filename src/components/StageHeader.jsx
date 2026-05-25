import { Pressable, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';
import { ArrowBackIcon } from './icons';

export default function StageHeader({
  action,
  children,
  onBack,
  title,
}) {
  return (
    <View style={styles.header}>
      <View style={[styles.headerRow, children && styles.headerRowWithChildren]}>
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

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    zIndex: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    marginBottom: 0,
  },
  headerRowWithChildren: {
    marginBottom: 14,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F2F4',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    width: 48,
  },
  title: {
    color: '#111827',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
});
