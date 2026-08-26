// РЎРїСЂР°РІРѕС‡РЅРёРє РєРѕРЅС„РёРіСѓСЂР°С†РёР№ РѕРїРµСЂР°С†РёР№ РїРѕ СЃС‚Р°С‚СѓСЃСѓ.
export const statusEventConfigs = {
  rooting: {
    title: 'РЈРєРѕСЂРµРЅРµРЅРёРµ',
    countField: 'rootedCount',
  },
  death: {
    title: 'Р“РёР±РµР»СЊ',
    countField: 'deathCount',
    requiresReason: true,
  },
  discard: {
    title: 'Р’С‹Р±СЂР°РєРѕРІРєР°',
    countField: 'discardCount',
    requiresReason: true,
  },
  introLoss: {
    title: 'РџРѕС‚РµСЂРё',
    countField: 'lossCount',
    requiresReason: true,
  },
  sale: {
    title: 'РџСЂРѕРґР°Р¶Р°',
    countField: 'saleCount',
  },
  propagation: {
    title: 'Р Р°Р·РјРЅРѕР¶РµРЅРёРµ',
    countField: 'propagationCount',
  },
  quarantine: {
    title: 'РљР°СЂР°РЅС‚РёРЅ',
    countField: '',
    requiresReason: true,
  },
  adaptationStress: {
    title: 'РќР°Р±Р»СЋРґРµРЅРёРµ',
    countField: '',
  },
  adaptationCare: {
    title: 'РЈС…РѕРґ',
    countField: '',
  },
  greenhouseObservation: {
    title: 'РќР°Р±Р»СЋРґРµРЅРёРµ',
    countField: '',
  },
  greenhouseCare: {
    title: 'РЈС…РѕРґ',
    countField: '',
  },
  hardeningObservation: {
    title: 'РќР°Р±Р»СЋРґРµРЅРёРµ',
    countField: '',
  },
  hardeningCare: {
    title: 'РЈС…РѕРґ',
    countField: '',
  },
  planting: {
    title: 'Р’С‹СЃР°РґРєР°',
    countField: '',
  },
  plantingObservation: {
    title: 'РќР°Р±Р»СЋРґРµРЅРёРµ',
    countField: '',
  },
  plantingCare: {
    title: 'РЈС…РѕРґ',
    countField: '',
  },
  plantingCompletion: {
    title: 'Р—Р°РІРµСЂС€РµРЅРёРµ',
    countField: '',
  },
  problem: {
    title: 'РџСЂРѕР±Р»РµРјР°',
    countField: '',
  },
  problemRecovery: {
    title: 'Р’С‹Р·РґРѕСЂРѕРІР»РµРЅРёРµ',
    countField: '',
  },
  problemIsolation: {
    title: 'РР·РѕР»СЏС†РёСЏ РїСЂРѕР±Р»РµРјС‹',
    countField: '',
  },
  movement: {
    title: 'РџРµСЂРµРјРµС‰РµРЅРёРµ',
    countField: '',
  },
  transplant: {
    title: 'РџРµСЂРµСЃР°РґРєР°',
    countField: 'transplantCount',
  },
};

export const introActionConfigs = {
  comment: {
    field: 'comment',
    type: 'comment',
    title: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№',
    error: 'Р’РІРµРґРёС‚Рµ РєРѕРјРјРµРЅС‚Р°СЂРёР№',
  },
  contamination: {
    field: 'contaminationNote',
    type: 'contamination',
    title: 'РљРѕРЅС‚Р°РјРёРЅР°С†РёСЏ',
    error: 'РћРїРёС€РёС‚Рµ РєРѕРЅС‚Р°РјРёРЅР°С†РёСЋ',
  },
  introLoss: {
    field: 'lossReason',
    type: 'introLoss',
    title: 'РџРѕС‚РµСЂРё',
    error: 'РЈРєР°Р¶РёС‚Рµ РїСЂРёС‡РёРЅСѓ РїРѕС‚РµСЂСЊ',
  },
  movement: {
    field: 'movementComment',
    type: 'movement',
    title: 'РџРµСЂРµРјРµС‰РµРЅРёРµ',
    error: 'РЈРєР°Р¶РёС‚Рµ РїР°СЂР°РјРµС‚СЂС‹ РїРµСЂРµРјРµС‰РµРЅРёСЏ',
  },
  quarantine: {
    field: 'quarantineReason',
    type: 'quarantine',
    title: 'РџРµСЂРµРІРѕРґ РІ РєР°СЂР°РЅС‚РёРЅ',
    error: 'РЈРєР°Р¶РёС‚Рµ РїСЂРёС‡РёРЅСѓ РєР°СЂР°РЅС‚РёРЅР°',
  },
  problem: {
    field: 'problemDescription',
    type: 'problem',
    title: 'РџСЂРѕР±Р»РµРјР°',
    error: 'РЈРєР°Р¶РёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РїР°СЂР°РјРµС‚СЂ РїСЂРѕР±Р»РµРјС‹',
  },
  problemRecovery: {
    field: 'recoveredQuantity',
    type: 'problemRecovery',
    title: 'Р’С‹Р·РґРѕСЂРѕРІР»РµРЅРёРµ',
    error: 'РЈРєР°Р¶РёС‚Рµ РєРѕР»РёС‡РµСЃС‚РІРѕ РІС‹Р·РґРѕСЂРѕРІРµРІС€РёС…',
  },
  problemIsolation: {
    field: 'isolationQuantity',
    type: 'problemIsolation',
    title: 'РР·РѕР»РёСЂРѕРІР°С‚СЊ СЂР°СЃС‚РµРЅРёСЏ',
    error: 'РЈРєР°Р¶РёС‚Рµ РєРѕР»РёС‡РµСЃС‚РІРѕ СЂР°СЃС‚РµРЅРёР№ РґР»СЏ РёР·РѕР»СЏС†РёРё',
  },
};

export function getStatusEventConfig(actionType) {
  return statusEventConfigs[actionType || 'rooting'];
}

export function getIntroActionConfig(actionType) {
  return introActionConfigs[actionType];
}

export function getSupportedStatusOperationTypes() {
  return Object.keys(statusEventConfigs);
}

export function getSupportedIntroActionTypes() {
  return Object.keys(introActionConfigs);
}
