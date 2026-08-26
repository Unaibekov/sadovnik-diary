import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AI_VOICE_STATUS,
  createAiVoiceInputState,
  extractSpeechResultText,
  getAiVoiceErrorMessage,
  getAiVoiceStatusText,
  mergeRecognizedTextIntoInput,
  reduceAiVoiceInputState,
} from '../domain/aiVoiceInput';
import StageHeader from '../components/StageHeader';
import styles from '../../styles';

export default function AiChatScreen({
  activeChatId,
  chats = [],
  error,
  inputValue,
  isSending = false,
  messages = [],
  onBack,
  onChangeInput,
  onDeleteChat,
  onNewDialog,
  onSelectChat,
  onSend,
  voiceContextualStrings = [],
}) {
  const hasMessages = messages.length > 0;
  const historyGroups = groupChatsByDate(chats);
  const [voiceState, setVoiceState] = useState(() => createAiVoiceInputState());
  const [isVoiceRecognitionAvailable, setIsVoiceRecognitionAvailable] = useState(false);
  const inputValueRef = useRef(inputValue);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    try {
      setIsVoiceRecognitionAvailable(Boolean(
        ExpoSpeechRecognitionModule.isRecognitionAvailable(),
      ));
    } catch {
      setIsVoiceRecognitionAvailable(false);
    }
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
      type: 'start-succeeded',
    }));
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!event?.isFinal) {
      return;
    }

    const recognizedText = extractSpeechResultText(event);

    if (!recognizedText) {
      setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
        type: 'result-empty',
      }));
      return;
    }

    onChangeInput?.(mergeRecognizedTextIntoInput(inputValueRef.current, recognizedText));
    setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
      text: recognizedText,
      type: 'result-received',
    }));
  });

  useSpeechRecognitionEvent('error', (event) => {
    const errorMessage = getAiVoiceErrorMessage(event);

    if (!errorMessage) {
      setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
        type: 'session-ended',
      }));
      return;
    }

    setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
      message: errorMessage,
      type: event?.error === 'not-allowed'
        ? 'permission-denied'
        : 'recognition-error',
    }));
  });

  useSpeechRecognitionEvent('end', () => {
    setVoiceState((currentState) => {
      if (currentState.status === AI_VOICE_STATUS.error) {
        return currentState;
      }

      return reduceAiVoiceInputState(currentState, {
        type: 'session-ended',
      });
    });
  });

  async function handleVoiceInputPress() {
    if (isSending) {
      return;
    }

    if (
      voiceState.status === AI_VOICE_STATUS.listening ||
      voiceState.status === AI_VOICE_STATUS.processing
    ) {
      setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
        type: 'stop-requested',
      }));
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (!isVoiceRecognitionAvailable) {
      setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
        message: Platform.OS === 'web'
          ? 'В этом браузере Web Speech API недоступен.'
          : 'Распознавание речи недоступно на этом устройстве.',
        type: 'recognition-error',
      }));
      return;
    }

    setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
      type: 'start-requested',
    }));

    try {
      const currentPermission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
          message: permission.canAskAgain
            ? 'Разрешите доступ к микрофону и распознаванию речи.'
            : 'Доступ к микрофону и распознаванию речи запрещён в настройках устройства.',
          type: 'permission-denied',
        }));
        return;
      }

      ExpoSpeechRecognitionModule.start({
        addsPunctuation: true,
        contextualStrings: voiceContextualStrings,
        continuous: false,
        interimResults: false,
        iosTaskHint: 'dictation',
        lang: 'ru-RU',
        maxAlternatives: 1,
      });
    } catch (startError) {
      setVoiceState((currentState) => reduceAiVoiceInputState(currentState, {
        message: `${startError?.message || 'Не удалось запустить голосовой ввод.'}`.trim(),
        type: 'recognition-error',
      }));
    }
  }

  const combinedError = voiceState.error || error;
  const voiceStatusText = getAiVoiceStatusText(voiceState.status);
  const voiceButtonLabel = (
    voiceState.status === AI_VOICE_STATUS.listening ||
    voiceState.status === AI_VOICE_STATUS.processing
  )
    ? 'Стоп'
    : 'Голос';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={localStyles.screen}
      >
        <StageHeader
          onBack={onBack}
          title="AI Chat"
        />
        <View style={localStyles.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onNewDialog}
            style={({ pressed }) => [
              styles.secondaryOutlineButton,
              localStyles.headerButton,
              pressed && styles.linkButtonPressed,
            ]}
          >
            <Text style={styles.secondaryOutlineButtonText}>Новый чат</Text>
          </Pressable>
        </View>

        <View style={localStyles.historyPanel}>
          <Text style={localStyles.historyTitle}>История чатов</Text>
          <ScrollView
            horizontal={false}
            showsVerticalScrollIndicator={false}
            style={localStyles.historyScroll}
          >
            {historyGroups.map((group) => (
              <View key={group.label} style={localStyles.historyGroup}>
                <Text style={localStyles.historyGroupTitle}>{group.label}</Text>
                {group.chats.map((chat) => {
                  const isActiveChat = chat.id === activeChatId;
                  const lastMessage = chat.messages[chat.messages.length - 1];

                  return (
                    <Pressable
                      key={chat.id}
                      accessibilityRole="button"
                      onPress={() => onSelectChat?.(chat.id)}
                      style={({ pressed }) => [
                        localStyles.historyItem,
                        isActiveChat && localStyles.historyItemActive,
                        pressed && localStyles.historyItemPressed,
                      ]}
                    >
                      <View style={localStyles.historyItemHeader}>
                        <Text numberOfLines={1} style={localStyles.historyItemTitle}>
                          {chat.title}
                        </Text>
                        <View style={localStyles.historyItemActions}>
                          <Text style={localStyles.historyItemDate}>
                            {formatChatTime(chat.updatedAt)}
                          </Text>
                          <Pressable
                            accessibilityLabel={`Удалить чат ${chat.title}`}
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={(event) => {
                              event.stopPropagation?.();
                              onDeleteChat?.(chat.id);
                            }}
                            style={({ pressed }) => [
                              localStyles.historyDeleteButton,
                              pressed && localStyles.historyDeleteButtonPressed,
                            ]}
                          >
                            <Text style={localStyles.historyDeleteButtonText}>×</Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={localStyles.historyItemPreview}>
                        {lastMessage?.text || 'Новый чат'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={localStyles.messagesPanel}>
          <ScrollView
            contentContainerStyle={[
              localStyles.messagesContent,
              !hasMessages && localStyles.emptyMessagesContent,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!hasMessages && (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyTitle}>Новый диалог готов</Text>
                <Text style={localStyles.emptyText}>
                  Отправьте первое сообщение, чтобы проверить связку Sadovnik Diary и Guru API.
                </Text>
              </View>
            )}

            {messages.map((message) => {
              const isUserMessage = message.role === 'user';

              return (
                <View
                  key={message.id}
                  style={[
                    localStyles.messageBubble,
                    isUserMessage ? localStyles.userBubble : localStyles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      localStyles.messageRole,
                      isUserMessage ? localStyles.userMessageRole : localStyles.aiMessageRole,
                    ]}
                  >
                    {isUserMessage ? 'Вы' : 'AI'}
                  </Text>
                  {isUserMessage ? (
                    <Text
                      style={[
                        localStyles.messageText,
                        localStyles.userMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  ) : (
                    <FormattedAiMessage text={message.text} />
                  )}
                </View>
              );
            })}

            {isSending && (
              <View style={localStyles.loadingRow}>
                <ActivityIndicator color="#15863F" size="small" />
                <Text style={localStyles.loadingText}>Ожидание ответа...</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={localStyles.composer}>
          <View style={localStyles.composerRow}>
            <TextInput
              editable={!isSending}
              multiline
              onChangeText={onChangeInput}
              placeholder="Введите сообщение"
              placeholderTextColor="#98A2B3"
              style={[
                styles.input,
                styles.multilineInput,
                localStyles.input,
                localStyles.inputWithVoiceButton,
                isSending && localStyles.inputDisabled,
              ]}
              value={inputValue}
            />

            <Pressable
              accessibilityLabel={
                voiceButtonLabel === 'Стоп'
                  ? 'Остановить голосовой ввод'
                  : 'Начать голосовой ввод'
              }
              accessibilityRole="button"
              onPress={handleVoiceInputPress}
              style={({ pressed }) => [
                localStyles.voiceButton,
                voiceState.status === AI_VOICE_STATUS.listening && localStyles.voiceButtonActive,
                voiceState.status === AI_VOICE_STATUS.processing && localStyles.voiceButtonProcessing,
                pressed && localStyles.voiceButtonPressed,
              ]}
            >
              <Text style={localStyles.voiceButtonText}>{voiceButtonLabel}</Text>
            </Pressable>
          </View>

          <View style={localStyles.voiceStatusRow}>
            {!!voiceStatusText && (
              <Text style={localStyles.voiceStatusText}>{voiceStatusText}</Text>
            )}
          </View>

          <View style={localStyles.errorSlot}>
            {!!combinedError && <Text style={styles.errorText}>{combinedError}</Text>}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isSending}
            onPress={onSend}
            style={({ pressed }) => [
              styles.primaryButton,
              isSending && localStyles.sendButtonDisabled,
              pressed && !isSending && styles.pressedButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSending ? 'Отправляем...' : 'Отправить'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    flex: 1,
    minHeight: 46,
  },
  historyPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    maxHeight: 156,
    paddingBottom: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  historyScroll: {
    minHeight: 0,
  },
  historyTitle: {
    color: '#17251C',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 10,
  },
  historyGroup: {
    gap: 8,
    marginBottom: 10,
  },
  historyGroupTitle: {
    color: '#65756B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  historyItem: {
    backgroundColor: '#F7FAF8',
    borderColor: '#E3EAE5',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyItemActive: {
    backgroundColor: '#EAF7EE',
    borderColor: '#15863F',
  },
  historyItemPressed: {
    opacity: 0.86,
  },
  historyItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  historyItemActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  historyItemTitle: {
    color: '#17251C',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  historyItemDate: {
    color: '#65756B',
    fontSize: 11,
    lineHeight: 14,
  },
  historyItemPreview: {
    color: '#5F7065',
    fontSize: 12,
    lineHeight: 16,
  },
  historyDeleteButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  historyDeleteButtonPressed: {
    backgroundColor: '#E9EEEB',
  },
  historyDeleteButtonText: {
    color: '#7B8A81',
    fontSize: 18,
    lineHeight: 18,
  },
  messagesPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    gap: 12,
    padding: 16,
  },
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  emptyTitle: {
    color: '#17251C',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyText: {
    color: '#65756B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  messageBubble: {
    borderRadius: 16,
    gap: 6,
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#15863F',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4F7F5',
    borderColor: '#E3EAE5',
    borderWidth: 1,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  userMessageRole: {
    color: '#DDF3E3',
  },
  aiMessageRole: {
    color: '#5F7065',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#17251C',
  },
  aiMessageBlock: {
    marginTop: 8,
  },
  aiMessageParagraph: {
    marginTop: 0,
  },
  aiMessageParagraphFirst: {
    marginTop: 0,
  },
  aiMessageListRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  aiMessageListMarker: {
    color: '#17251C',
    flexShrink: 0,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    minWidth: 22,
  },
  aiMessageListItem: {
    flex: 1,
    paddingLeft: 0,
  },
  aiMessageListItemText: {
    color: '#17251C',
    fontSize: 15,
    lineHeight: 21,
  },
  aiMessageBold: {
    fontWeight: '800',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  loadingText: {
    color: '#65756B',
    fontSize: 14,
    lineHeight: 20,
  },
  composer: {
    gap: 10,
    marginTop: 14,
  },
  composerRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 96,
  },
  inputWithVoiceButton: {
    marginBottom: 0,
  },
  inputDisabled: {
    opacity: 0.75,
  },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: '#F4F7F5',
    borderColor: '#D5E4DA',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 96,
    paddingHorizontal: 12,
    width: 84,
  },
  voiceButtonActive: {
    backgroundColor: '#EAF7EE',
    borderColor: '#15863F',
  },
  voiceButtonProcessing: {
    backgroundColor: '#EEF2F0',
  },
  voiceButtonPressed: {
    opacity: 0.82,
  },
  voiceButtonText: {
    color: '#17251C',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  voiceStatusRow: {
    minHeight: 18,
  },
  voiceStatusText: {
    color: '#65756B',
    fontSize: 12,
    lineHeight: 16,
  },
  errorSlot: {
    minHeight: 20,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
});

function formatChatTime(value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function groupChatsByDate(chats) {
  const now = new Date();
  const today = getStartOfDay(now).getTime();
  const yesterday = today - (24 * 60 * 60 * 1000);
  const groups = {
    Сегодня: [],
    Вчера: [],
    Ранее: [],
  };

  (Array.isArray(chats) ? chats : []).forEach((chat) => {
    const updatedDate = new Date(chat.updatedAt);
    const dayStart = getStartOfDay(updatedDate).getTime();

    if (Number.isNaN(updatedDate.getTime())) {
      groups.Ранее.push(chat);
      return;
    }

    if (dayStart === today) {
      groups.Сегодня.push(chat);
      return;
    }

    if (dayStart === yesterday) {
      groups.Вчера.push(chat);
      return;
    }

    groups.Ранее.push(chat);
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, groupedChats]) => ({
      chats: groupedChats,
      label,
    }));
}

function FormattedAiMessage({ text }) {
  const paragraphs = buildAiMessageParagraphs(text);

  return (
    <View>
      {paragraphs.map((paragraph, index) => (
        <View
          key={`${index}-${paragraph.marker}-${paragraph.text}`}
          style={[
            localStyles.aiMessageBlock,
            index === 0 && localStyles.aiMessageParagraphFirst,
          ]}
        >
          {paragraph.isListItem ? (
            <View style={localStyles.aiMessageListRow}>
              <Text style={localStyles.aiMessageListMarker}>{paragraph.marker}</Text>
              <Text
                style={[
                  localStyles.messageText,
                  localStyles.aiMessageListItemText,
                  localStyles.aiMessageText,
                  localStyles.aiMessageParagraph,
                  localStyles.aiMessageListItem,
                ]}
              >
                {renderFormattedInlineText(paragraph.text)}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                localStyles.messageText,
                localStyles.aiMessageListItemText,
                localStyles.aiMessageText,
                localStyles.aiMessageParagraph,
              ]}
            >
              {renderFormattedInlineText(paragraph.text)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function buildAiMessageParagraphs(text) {
  const normalizedText = normalizeAiMessageText(text);
  const rawParagraphs = normalizedText
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) {
    return [{ isListItem: false, marker: '', text: '' }];
  }

  return rawParagraphs.flatMap((paragraph) => (
    paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const listMatch = line.match(/^((?:\d+\.|-|•))\s+(.*)$/u);

        if (listMatch) {
          return {
            isListItem: true,
            marker: listMatch[1],
            text: listMatch[2],
          };
        }

        return {
          isListItem: false,
          marker: '',
          text: line,
        };
      })
  ));
}

function normalizeAiMessageText(text) {
  const sourceText = `${text || ''}`.replace(/\r\n?/gu, '\n').trim();

  if (!sourceText) {
    return '';
  }

  return sourceText
    .replace(/\s+(?=\d+\.\s+)/gu, '\n')
    .replace(/\s+(?=-\s+\*\*)/gu, '\n')
    .replace(/\s+(?=\d+\.\s+[A-ZА-ЯЁ])/gu, '\n')
    .replace(/\s+-\s+(?=\*\*)/gu, '\n- ')
    .replace(/:\s+(?=\*\*)/gu, ':\n')
    .replace(/([.!?])\s+(?=\*\*[^\n*]+\*\*:)/gu, '$1\n')
    .replace(/:\s+(?=\*\*[^\n*]+\*\*:)/gu, ':\n')
    .replace(/(?<!\n)(\*\*[^\n*]+\*\*:)/gu, '\n$1')
    .replace(/(\*\*[^\n*]+\*\*:)\s+/gu, '$1 ')
    .replace(/\n{3,}/gu, '\n\n');
}

function renderFormattedInlineText(text) {
  const segments = `${text || ''}`.split(/(\*\*[^*]+\*\*)/gu).filter(Boolean);

  return segments.map((segment, index) => {
    const boldMatch = segment.match(/^\*\*([^*]+)\*\*$/u);

    if (boldMatch) {
      return (
        <Text key={`bold-${index}`} style={localStyles.aiMessageBold}>
          {boldMatch[1]}
        </Text>
      );
    }

    return <Text key={`text-${index}`}>{segment}</Text>;
  });
}
