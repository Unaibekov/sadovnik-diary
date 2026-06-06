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
  quarantineReleased: {
    title: 'Снятие карантина',
    countField: '',
    requiresReason: true,
  },
  adaptationStress: {
    title: 'Наблюдение',
    countField: '',
  },
  adaptationEnvironment: {
    title: 'Изменение среды',
    countField: '',
  },
  adaptationHumidityReduction: {
    title: 'Снижение влажности',
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
  greenhouseEnvironment: {
    title: 'Среда',
    countField: '',
  },
  greenhouseDisease: {
    title: 'Болезни / вредители',
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
    photo: {
      field: 'photoNote',
      type: 'photo',
      title: '\u0424\u043e\u0442\u043e',
      error: '\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0444\u043e\u0442\u043e \u0438\u043b\u0438 \u0441\u0441\u044b\u043b\u043a\u0443',
    },
    contamination: {
      field: 'contaminationNote',
      type: 'contamination',
      title: '\u041a\u043e\u043d\u0442\u0430\u043c\u0438\u043d\u0430\u0446\u0438\u044f',
      error: '\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u043a\u043e\u043d\u0442\u0430\u043c\u0438\u043d\u0430\u0446\u0438\u044e',
    },
    quarantine: {
      field: 'quarantineReason',
      type: 'quarantine',
      title: '\u041f\u0435\u0440\u0435\u0432\u043e\u0434 \u0432 \u043a\u0430\u0440\u0430\u043d\u0442\u0438\u043d',
      error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u043a\u0430\u0440\u0430\u043d\u0442\u0438\u043d\u0430',
    },
  };

  return introActionConfigs[actionType];
}
