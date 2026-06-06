// Вкладка журнала культуры со списком операций.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import styles from '../../styles';
import { INTRO_STAGE, stages } from '../domain/constants';
import { formatDisplayDate, formatDisplayTime } from '../domain/dates';
import { getOperationSummaryItems } from '../domain/batch';
import { getOperationEffectiveStage } from '../domain/journal';
import { EditIcon, TrashIcon } from './icons';

export default function CultureJournalTab({
  canDeleteOperation,
  canEditOperation,
  card,
  operations,
  onDeleteOperation,
  onEditOperation,
}) {
  const stageOrder = [INTRO_STAGE, ...stages.filter((stage) => stage !== INTRO_STAGE)];
  const getStageRank = (stage) => {
    const index = stageOrder.indexOf(stage);

    return index === -1 ? stageOrder.length : index;
  };

  const groupedOperations = operations
    .reduce((groups, operation) => {
      const stageKey = getOperationEffectiveStage(operation, card) || INTRO_STAGE;
      const existingGroup = groups.find((group) => group.stage === stageKey);

      if (existingGroup) {
        existingGroup.operations.push(operation);
        return groups;
      }

      return [
        ...groups,
        {
          stage: stageKey,
          operations: [operation],
        },
      ];
    }, [])
    .sort((first, second) => getStageRank(first.stage) - getStageRank(second.stage));

  return (
    <View style={localStyles.journalContainer}>
      {operations.length === 0 && <Text style={styles.journalEmpty}>Событий пока нет</Text>}

      {groupedOperations.map((group) => (
        <View key={group.stage} style={localStyles.stageGroupCard}>
          <Text style={localStyles.stageGroupTitle}>{group.stage}</Text>

          <View style={localStyles.stageGroupBody}>
            {group.operations.map((operation) => {
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
        </View>
      ))}
    </View>
  );
}

const localStyles = StyleSheet.create({
  journalContainer: {
    gap: 12,
  },
  stageGroupCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6EDE7',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  stageGroupTitle: {
    color: '#15863F',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  stageGroupBody: {
    gap: 12,
  },
});
