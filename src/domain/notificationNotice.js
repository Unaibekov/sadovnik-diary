// Тексты уведомлений для действий с карточкой.
export function getWateringReminderNotice(result) {
  if (result === 'scheduled') {
    return 'Напоминание о поливе запланировано через 1 минуту.';
  }

  return 'Не удалось включить уведомления. Проверьте разрешения телефона.';
}
