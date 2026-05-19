import { Image, Pressable, Text, View } from 'react-native';
import styles from '../../styles';

export default function StageHeader({
  children,
  onBack,
  title,
}) {
  return (
    <View style={styles.fixedCardsHeader}>
      <View style={styles.cultureListHeaderRow}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [
            styles.headerBackButton,
            pressed && styles.linkButtonPressed,
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            source={require('../../assets/img/arrow.svg')}
            style={styles.headerBackIcon}
          />
        </Pressable>

        <Text style={styles.cultureListTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}
