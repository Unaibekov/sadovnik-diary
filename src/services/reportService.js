import * as XLSX from 'xlsx';
import { BATCH_STATUS_LABELS, INTRO_STAGE } from '../domain/constants';
import { getCardLocationDescription } from '../domain/batch';
import { formatDisplayDate, formatDisplayDateTime } from '../domain/dates';

export function normalizeReportCell(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).replace(/\r?\n/g, ' ').trim();
}

export function setSheetColumnWidths(sheet, widths) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}

export function buildCultureCardsReportWorkbook(cards, helpers) {
  const {
    getCardCurrentQuantity,
    getOperationSummaryItems,
    getResolvedBatchStatus,
  } = helpers;

  const partyRows = [
    [
      'Код',
      'Культура',
      'Вид',
      'Сорт',
      'Стадия',
      'Статус',
      'Местоположение',
      'Количество',
      'Дата создания',
      'Событий в журнале',
    ],
    ...cards.map((card) => {
      const status = getResolvedBatchStatus(card);

      return [
        card.code,
        card.cultureName,
        card.speciesName,
        card.varietyName,
        card.stage || INTRO_STAGE,
        BATCH_STATUS_LABELS[status] || status,
        getCardLocationDescription(card) || 'Не указано',
        getCardCurrentQuantity(card),
        card.createdAt ? formatDisplayDate(card.createdAt) : '',
        (card.operations || []).length,
      ];
    }),
  ];

  const journalRows = [
    [
      'Код',
      'Культура',
      'Вид',
      'Сорт',
      'Стадия партии',
      'Статус партии',
      'Дата события',
      'Тип события',
      'Стадия события',
      'Текущее количество',
      'Остаток',
      'Детали',
      'Старое место',
      'Новое место',
      'Комментарий',
      'Фото / заметка',
      'Создано',
    ],
    ...cards
      .flatMap((card) => {
        const status = getResolvedBatchStatus(card);

        return (card.operations || [])
          .filter((operation) => operation.type !== 'stageSettingsUpdated')
          .map((operation) => {
            const summary = getOperationSummaryItems(operation, card)
              .map(([label, value]) => `${label}: ${value}`)
              .join('; ');

            return {
              sortDate: operation.createdAt || operation.date || '',
              row: [
                card.code,
                card.cultureName,
                card.speciesName,
                card.varietyName,
                card.stage || INTRO_STAGE,
                BATCH_STATUS_LABELS[status] || status,
                operation.date ? formatDisplayDate(operation.date) : '',
                operation.title || operation.type || '',
                operation.stage || operation.toStage || operation.fromStage || '',
                getCardCurrentQuantity(card),
                operation.currentQuantity ?? '',
                summary,
                operation.type === 'movement' ? operation.previousLocation || 'Не указано' : '',
                operation.type === 'movement' ? operation.nextLocation || 'Не указано' : '',
                operation.comment || operation.reason || operation.quarantineReason || '',
                operation.contaminationNote || '',
                operation.createdAt ? formatDisplayDateTime(operation.createdAt) : '',
              ].map(normalizeReportCell),
            };
          });
      })
      .sort((first, second) => new Date(second.sortDate || 0) - new Date(first.sortDate || 0))
      .map(({ row }) => row),
  ];

  const workbook = XLSX.utils.book_new();
  const partiesSheet = XLSX.utils.aoa_to_sheet(partyRows);
  const journalSheet = XLSX.utils.aoa_to_sheet(journalRows);

  setSheetColumnWidths(partiesSheet, [20, 18, 18, 18, 22, 14, 28, 12, 16, 18]);
  setSheetColumnWidths(journalSheet, [20, 18, 18, 18, 22, 14, 16, 24, 22, 14, 12, 60, 24, 24, 36, 36, 18]);
  XLSX.utils.book_append_sheet(workbook, partiesSheet, 'Партии');
  XLSX.utils.book_append_sheet(workbook, journalSheet, 'Журнал');

  return workbook;
}
