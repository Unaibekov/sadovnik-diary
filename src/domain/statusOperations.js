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
      title: '\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439',
      error: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439',
    },
    contamination: {
      field: 'contaminationNote',
      type: 'contamination',
      title: '\u041a\u043e\u043d\u0442\u0430\u043c\u0438\u043d\u0430\u0446\u0438\u044f',
      error: '\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u043a\u043e\u043d\u0442\u0430\u043c\u0438\u043d\u0430\u0446\u0438\u044e',
    },
    introLoss: {
      field: 'lossReason',
      type: 'introLoss',
      title: '\u041f\u043e\u0442\u0435\u0440\u0438',
      error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u043f\u043e\u0442\u0435\u0440\u044c',
    },
    movement: {
      field: 'movementComment',
      type: 'movement',
      title: '\u041f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u0435',
      error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u044f',
    },
    quarantine: {
      field: 'quarantineReason',
      type: 'quarantine',
      title: '\u041f\u0435\u0440\u0435\u0432\u043e\u0434 \u0432 \u043a\u0430\u0440\u0430\u043d\u0442\u0438\u043d',
      error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u043a\u0430\u0440\u0430\u043d\u0442\u0438\u043d\u0430',
    },
    problem: {
      field: 'problemDescription',
      type: 'problem',
      title: '\u041f\u0440\u043e\u0431\u043b\u0435\u043c\u0430',
      error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u044b',
    },
    problemRecovery: {
      field: 'recoveredQuantity',
      type: 'problemRecovery',
      title: '\u0412\u044b\u0437\u0434\u043e\u0440\u043e\u0432\u043b\u0435\u043d\u0438\u0435',
      error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0432\u044b\u0437\u0434\u043e\u0440\u043e\u0432\u0435\u0432\u0448\u0438\u0445',
    },
  };

  return introActionConfigs[actionType];
}
