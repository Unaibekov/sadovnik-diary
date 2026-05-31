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
