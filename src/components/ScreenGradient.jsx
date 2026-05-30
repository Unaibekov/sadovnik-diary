import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export default function ScreenGradient() {
  return (
    <View pointerEvents="none" style={styles.root}>
      <Svg height="100%" width="100%">
        <Defs>
          <LinearGradient id="screenGradient" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#f5f1dd" />
            <Stop offset="0.28" stopColor="#CFF6B8" />
            <Stop offset="0.56" stopColor="#B7EFD8" />
            <Stop offset="0.78" stopColor="#BFDFF4" />
            <Stop offset="1" stopColor="#DCC7F2" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#screenGradient)" height="100%" width="100%" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
});
