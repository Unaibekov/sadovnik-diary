// Начальное состояние экрана редактирования операции.
import { createEmptyIntroActionForm, createEmptyStatusForm } from './forms';
import { INTRO_STAGE } from './constants';
import { editableStatusOperationTypes } from './operationConfig';
import { buildStatusFormFromOperation } from './statusOperationForm';

export function buildOperationEditState({
  operation,
  selectedCardStage,
  introOperationFields,
  statusEventCountFields,
}) {
  if (!operation) {
    return null;
  }

  if (selectedCardStage === INTRO_STAGE && operation.type === 'problem') {
    return {
      introActionType: operation.type,
      introActionForm: {
        ...createEmptyIntroActionForm(),
        problemType: operation.problemType || '',
        riskLevel: operation.riskLevel || '',
        affectedQuantity: operation.affectedQuantity || '',
        problemDescription: operation.problemDescription || '',
        comment: operation.comment || '',
        photoUri: operation.photoUri || '',
        photoUris: Array.isArray(operation.photoUris) && operation.photoUris.length > 0
          ? operation.photoUris.filter(Boolean)
          : operation.photoUri
            ? [operation.photoUri]
            : [],
      },
      isDateEntryExpanded: true,
      cultureCalendarTab: 'calendar',
      currentScreen: 'introActionForm',
    };
  }

  if (selectedCardStage === INTRO_STAGE && operation.type === 'problemRecovery') {
    return {
      introActionType: operation.type,
      introActionForm: {
        ...createEmptyIntroActionForm(),
        recoveredQuantity: operation.recoveredQuantity || '',
        riskLevel: operation.riskLevel || '',
        comment: operation.comment || '',
        photoUri: operation.photoUri || '',
        photoUris: Array.isArray(operation.photoUris) && operation.photoUris.length > 0
          ? operation.photoUris.filter(Boolean)
          : operation.photoUri
            ? [operation.photoUri]
            : [],
      },
      isDateEntryExpanded: true,
      cultureCalendarTab: 'calendar',
      currentScreen: 'introActionForm',
    };
  }

  if (selectedCardStage === INTRO_STAGE && introOperationFields[operation.type]) {
    if (operation.type === 'introLoss') {
      return {
        introActionType: operation.type,
        introActionForm: {
          ...createEmptyIntroActionForm(),
          lossCount: operation.count || '',
          lossReason: operation.reason || operation.lossReason || '',
        },
        isDateEntryExpanded: true,
        cultureCalendarTab: 'calendar',
        currentScreen: 'introActionForm',
      };
    }

    return {
      introActionType: operation.type,
      introActionForm: {
        ...createEmptyIntroActionForm(),
        [introOperationFields[operation.type]]: operation[introOperationFields[operation.type]] || '',
        photoUri: operation.photoUri || '',
        photoUris: Array.isArray(operation.photoUris) && operation.photoUris.length > 0
          ? operation.photoUris.filter(Boolean)
          : operation.photoUri
            ? [operation.photoUri]
            : [],
      },
      isDateEntryExpanded: true,
      cultureCalendarTab: 'calendar',
      currentScreen: 'introActionForm',
    };
  }

  if (
    statusEventCountFields[operation.type] !== undefined ||
    editableStatusOperationTypes.includes(operation.type)
  ) {
    const countField = statusEventCountFields[operation.type];

    return {
      introActionType: operation.type,
      statusForm: {
        ...createEmptyStatusForm(),
        ...buildStatusFormFromOperation(operation, countField),
      },
      currentScreen: 'statusChangeForm',
    };
  }

  return null;
}
