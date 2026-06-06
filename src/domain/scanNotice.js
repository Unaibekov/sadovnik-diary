// Текст уведомления для результата сканирования.
import { getCardDisplayName } from './batch';

export function getScanNotice({ scannedCode, matchedCard }) {
  if (!matchedCard) {
    return scannedCode
      ? `Карточка с QR-кодом ${scannedCode} не найдена.`
      : 'QR-код найден, но его значение пустое.';
  }

  return `Открыта карточка: ${getCardDisplayName(matchedCard)}.`;
}

export function getScanErrorNotice() {
  return 'Не удалось открыть сканер QR-кода.';
}

export function getScanWebNotice() {
  return 'QR-сканер доступен только в мобильном приложении.';
}
