// Справочник конфигураций операций по статусу.
const statusEventConfigs = {
  rooting: {
    title: 'Укоренение',
    countField: 'rootedCount',
  },
  death: {
    title: 'Гибель',
    countField: 'deathCount',
    requiresReason: true,
  },
  discard: {
    title: 'Выбраковка',
    countField: 'discardCount',
    requiresReason: true,
  },
  introLoss: {
    title: 'Потери',
    countField: 'lossCount',
    requiresReason: true,
  },
  sale: {
    title: 'Продажа',
    countField: 'saleCount',
  },
  propagation: {
    title: 'Размножение',
    countField: 'propagationCount',
  },
  quarantine: {
    title: 'Карантин',
    countField: '',
    requiresReason: true,
  },
  adaptationStress: {
    title: 'Наблюдение',
    countField: '',
  },
  adaptationCare: {
    title: 'Уход',
    countField: '',
  },
  greenhouseObservation: {
    title: 'Наблюдение',
    countField: '',
  },
  greenhouseCare: {
    title: 'Уход',
    countField: '',
  },
  hardeningObservation: {
    title: 'Наблюдение',
    countField: '',
  },
  hardeningCare: {
    title: 'Уход',
    countField: '',
  },
  planting: {
    title: 'Высадка',
    countField: '',
  },
  plantingObservation: {
    title: 'Наблюдение',
    countField: '',
  },
  plantingCare: {
    title: 'Уход',
    countField: '',
  },
  plantingCompletion: {
    title: 'Завершение',
    countField: '',
  },
  problem: {
    title: 'Проблема',
    countField: '',
  },
  problemRecovery: {
    title: 'Выздоровление',
    countField: '',
  },
  problemIsolation: {
    title: 'Изоляция проблемы',
    countField: '',
  },
  movement: {
    title: 'Перемещение',
    countField: '',
  },
  transplant: {
    title: 'Пересадка',
    countField: 'transplantCount',
  },
};

export function getStatusEventConfig(actionType) {
  return statusEventConfigs[actionType || 'rooting'];
}

export function getIntroActionConfig(actionType) {
  const introActionConfigs = {
    comment: {
      field: 'comment',
      type: 'comment',
      title: 'Комментарий',
      error: 'Введите комментарий',
    },
    contamination: {
      field: 'contaminationNote',
      type: 'contamination',
      title: 'Контаминация',
      error: 'Опишите контаминацию',
    },
    introLoss: {
      field: 'lossReason',
      type: 'introLoss',
      title: 'Потери',
      error: 'Укажите причину потерь',
    },
    movement: {
      field: 'movementComment',
      type: 'movement',
      title: 'Перемещение',
      error: 'Укажите параметры перемещения',
    },
    quarantine: {
      field: 'quarantineReason',
      type: 'quarantine',
      title: 'Перевод в карантин',
      error: 'Укажите причину карантина',
    },
    problem: {
      field: 'problemDescription',
      type: 'problem',
      title: 'Проблема',
      error: 'Укажите хотя бы один параметр проблемы',
    },
    problemRecovery: {
      field: 'recoveredQuantity',
      type: 'problemRecovery',
      title: 'Выздоровление',
      error: 'Укажите количество выздоровевших',
    },
    problemIsolation: {
      field: 'isolationQuantity',
      type: 'problemIsolation',
      title: 'Изолировать растения',
      error: 'Укажите количество растений для изоляции',
    },
  };

  return introActionConfigs[actionType];
}
