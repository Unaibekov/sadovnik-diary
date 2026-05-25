import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';

export default function CultureFormScreen({
  children,
  footer,
  onBack,
  title,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.fixedCardsScreen}>
        <StageHeader
          onBack={onBack}
          title={title}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.cultureFormScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.surfacePanel, styles.formPanel]}>
              {children}
            </View>
            {!!footer && (
              <View style={styles.cultureFormFooter}>
                {footer}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

