// Конфигурации событий операций и счетчики статусов.
import { BATCH_STATUS_LABELS, stages } from './constants';

export const statusEventCountFields = {
  rooting: 'rootedCount',
  death: 'deathCount',
  discard: 'discardCount',
  introLoss: 'lossCount',
  sale: 'saleCount',
  propagation: 'propagationCount',
  transplant: 'transplantCount',
};

export const introOperationFields = {
  comment: 'comment',
  photo: 'photoNote',
  contamination: 'contaminationNote',
  introLoss: 'lossReason',
  quarantine: 'quarantineReason',
  problem: 'problemDescription',
};

export const editableStatusOperationTypes = [
  'rooting',
  'death',
  'discard',
  'introLoss',
  'sale',
  'propagation',
  'quarantine',
  'quarantineReleased',
  'adaptationStress',
  'adaptationEnvironment',
  'adaptationHumidityReduction',
  'adaptationCare',
  'greenhouseObservation',
  'greenhouseCare',
  'greenhouseEnvironment',
  'greenhouseDisease',
  'hardeningObservation',
  'hardeningCare',
  'planting',
  'plantingObservation',
  'plantingCare',
  'plantingCompletion',
  'problem',
  'movement',
  'transplant',
];

export const protectedOperationTypes = [
  'contamination',
  'quarantine',
  'quarantineReleased',
];

export const stageHomeItems = [
  {
    iconName: 'intro',
    iconBoxStyle: 'stageIconBoxGreen',
    label: '\u0412\u0432\u0435\u0434\u0435\u043d\u0438\u0435\n\u0432 \u043a\u0443\u043b\u044c\u0442\u0443\u0440\u0443',
    title: stages[0],
  },
  {
    iconName: 'clone',
    iconBoxStyle: 'stageIconBoxMint',
    label: '\u041a\u043b\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435',
    title: stages[1],
  },
  {
    iconName: 'adaptation',
    iconBoxStyle: 'stageIconBoxAqua',
    label: '\u0410\u0434\u0430\u043f\u0442\u0430\u0446\u0438\u044f',
    title: stages[2],
  },
  {
    iconName: 'greenhouse',
    iconBoxStyle: 'stageIconBoxLime',
    label: '\u0422\u0435\u043f\u043b\u0438\u0446\u0430',
    title: stages[3],
  },
  {
    iconName: 'hardening',
    iconBoxStyle: 'stageIconBoxSky',
    label: '\u0417\u0430\u043a\u0430\u043b\u043a\u0430',
    title: stages[4],
  },
  {
    iconName: 'planting',
    iconBoxStyle: 'stageIconBoxOrange',
    label: '\u0412\u044b\u0441\u0430\u0434\u043a\u0430',
    title: stages[5],
  },
];
