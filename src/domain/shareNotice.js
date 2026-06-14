// Тексты уведомлений для обмена QR-кодом.
export function getShareQrNotice(shareResult) {
  if (shareResult === 'web_ready') {
    return 'QR-код подготовлен для отправки.';
  }

  if (shareResult === 'native_unavailable') {
    return 'Системное отправление недоступно, QR-код подготовлен текстом.';
  }

  return 'QR-код отправлен через системное меню.';
}

export function getShareReportNotice(shareResult) {
  if (shareResult === 'web_ready') {
    return 'Excel-отчет подготовлен.';
  }

  if (shareResult === 'native_unavailable') {
    return 'Отправка Excel-файла недоступна на устройстве.';
  }

  return 'Excel-файл отчета готов к отправке.';
}

export function getShareZipReportNotice(shareResult) {
  if (shareResult === 'web_downloaded') {
    return 'ZIP-отчет скачан.';
  }

  if (shareResult === 'web_ready') {
    return 'ZIP-отчет подготовлен.';
  }

  if (shareResult === 'native_unavailable') {
    return 'Отправка ZIP-файла недоступна на устройстве.';
  }

  return 'ZIP-отчет готов к отправке.';
}
