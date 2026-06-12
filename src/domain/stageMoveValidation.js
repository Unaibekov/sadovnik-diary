// Проверка корректности перемещения между стадиями.
import { INTRO_STAGE, stages } from './constants';

export function getStageMoveValidationError({
  selectedCard,
  qrStatus,
  cloneStats,
  adaptationStats,
}) {
  if (!selectedCard) {
    return '';
  }

  if (selectedCard.sterilityStatus === 'contaminated') {
    return 'Материал заражён: переход стадии заблокирован до решения администратора или агронома';
  }

  if (selectedCard.stage === INTRO_STAGE) {
    if ((selectedCard.batchStatus || 'active') !== 'active') {
      return 'Перевести можно только активную партию';
    }

    if (qrStatus === 'none') {
      return 'QR-код ещё не создан';
    }
  }

  if (selectedCard.stage === stages[1]) {
    if ((selectedCard.batchStatus || 'active') === 'quarantine') {
      return 'Партия в карантине и не может быть переведена дальше';
    }

    if (
      (selectedCard.batchStatus || 'active') === 'problem' ||
      cloneStats?.riskStatus === 'Критический'
    ) {
      return 'Нельзя перевести партию с критическим статусом';
    }

    if ((cloneStats?.rootedCount || 0) <= 0) {
      return 'Сначала зафиксируйте укоренившиеся растения';
    }

    if ((cloneStats?.currentQuantity || 0) <= 0) {
      return 'Остаток партии должен быть больше 0';
    }
  }

  if (selectedCard.stage === stages[2]) {
    if ((selectedCard.batchStatus || 'active') === 'quarantine') {
      return 'Партия в карантине и не может быть переведена дальше';
    }

    if (selectedCard.sterilityStatus === 'contaminated') {
      return 'Есть активная контаминация';
    }

    if (adaptationStats?.riskStatus === 'Критический') {
      return 'Нельзя перевести партию с критическим стрессом';
    }


    if ((adaptationStats?.currentQuantity || 0) <= 0) {
      return 'Остаток партии должен быть больше 0';
    }
  }

  return '';
}
