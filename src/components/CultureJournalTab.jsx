import { Pressable, Text, View } from 'react-native';
import styles from '../../styles';
import { formatDisplayDate, formatDisplayTime } from '../domain/dates';
import { getOperationSummaryItems } from '../domain/batch';
import { EditIcon, TrashIcon } from './icons';

export default function CultureJournalTab({
  canDeleteOperation,
  canEditOperation,
  card,
  operations,
  onDeleteOperation,
  onEditOperation,
}) {
  return (
    <View style={[styles.surfacePanel, styles.journalPanel]}>
      <Text style={styles.journalTitle}>Журнал</Text>
      {operations.length === 0 && (
        <Text style={styles.journalEmpty}>Событий пока нет</Text>
      )}
      {operations.map((operation) => {
        const summaryItems = getOperationSummaryItems(operation, card);

        return (
          <View
            key={operation.id}
            style={[
              styles.journalItem,
              ['contamination', 'quarantine'].includes(operation.type) && styles.journalItemWarning,
            ]}
          >
            <View style={styles.operationHeaderRow}>
              <Text style={styles.journalItemTitle}>{operation.title || 'Событие'}</Text>
              <View style={styles.operationActions}>
                {canEditOperation(operation) && (
                  <Pressable
                    accessibilityLabel="Редактировать запись"
                    accessibilityRole="button"
                    onPress={() => onEditOperation(operation)}
                    style={({ pressed }) => [
                      styles.operationActionButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <EditIcon size={20} />
                  </Pressable>
                )}
                {canDeleteOperation(operation) && (
                  <Pressable
                    accessibilityLabel="Удалить запись"
                    accessibilityRole="button"
                    onPress={() => onDeleteOperation(operation.id)}
                    style={({ pressed }) => [
                      styles.operationActionButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <TrashIcon size={20} />
                  </Pressable>
                )}
              </View>
            </View>
            {!!operation.date && (
              <Text style={styles.journalItemDate}>
                {formatDisplayDate(operation.date)}
                {operation.createdAt ? `, ${formatDisplayTime(operation.createdAt)}` : ''}
              </Text>
            )}
            {summaryItems.map(([label, value]) => (
              <Text key={label} style={styles.journalItemText}>
                {label}: {value}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}
