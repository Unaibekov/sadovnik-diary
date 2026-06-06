// Работа с рекомендациями, привязанными к карточке.
import { EMPTY_CATALOG_VALUE, stages } from './constants';
import { getCardDisplayName } from './batch';

export function removeRecommendationFields(card) {
  const {
    temperatureRequirement,
    lightRequirement,
    humidityRequirement,
    preventionItems,
    ...cardWithoutRecommendations
  } = card || {};

  return {
    ...cardWithoutRecommendations,
    operations: (cardWithoutRecommendations.operations || [])
      .filter((operation) => operation.type !== 'stageSettingsUpdated'),
  };
}

export function findCatalogPlant(card, catalog) {
  return (catalog || []).find((plant) => (
    (plant.cultureName || EMPTY_CATALOG_VALUE) === card.cultureName &&
    (plant.speciesName || EMPTY_CATALOG_VALUE) === card.speciesName &&
    (plant.varietyName || EMPTY_CATALOG_VALUE) === card.varietyName
  ));
}

export function normalizeRecommendationText(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => [item.name, item.applicationRate, item.frequency].filter(Boolean).join(' В· '))
      .filter(Boolean)
      .join('\n');
  }

  return value || '';
}

export function getPlantRecommendationItems(plant, stage) {
  if (!plant) {
    return [];
  }

  const isCloneStageRecommendation = stage === stages[1];
  const temperature = isCloneStageRecommendation
    ? plant.cloneTemperatureRequirement
    : plant.adaptationTemperatureRequirement || plant.cloneTemperatureRequirement;
  const light = isCloneStageRecommendation
    ? plant.cloneLightRequirement
    : plant.adaptationLightRequirement || plant.cloneLightRequirement;
  const humidity = isCloneStageRecommendation
    ? plant.cloneHumidityRange && `${plant.cloneHumidityRange}%`
    : plant.adaptationHumidityRequirement || (plant.cloneHumidityRange && `${plant.cloneHumidityRange}%`);
  const preventionItems = isCloneStageRecommendation
    ? ''
    : normalizeRecommendationText(plant.adaptationPreventionItems);

  return [
    { label: 'Температура', value: temperature },
    { label: 'Освещение', value: light },
    { label: 'Влажность', value: humidity },
    { label: 'Подкормки', value: plant.preventionFertilizers },
    { label: 'Препараты', value: plant.preventionChemicals },
    { label: 'Стимуляторы', value: plant.preventionStimulators },
    { label: 'Схема', value: plant.preventionApplicationRate },
    { label: 'Период', value: plant.preventionFrequency },
    { label: 'Профилактика', value: preventionItems },
  ].filter((item) => Boolean(item.value));
}

export function getStagePlantRecommendationItems(plant, stage) {
  if (!plant || stage === stages[0]) {
    return [];
  }

  if (stage === stages[1]) {
    return [
      { label: 'Температура', value: plant.cloneTemperatureRequirement },
      { label: 'Освещение', value: plant.cloneLightRequirement },
      { label: 'Влажность', value: plant.cloneHumidityRange && `${plant.cloneHumidityRange}%` },
      { label: 'Подкормки', value: plant.preventionFertilizers },
      { label: 'Стимуляторы', value: plant.preventionStimulators },
      { label: 'Период', value: plant.preventionFrequency },
    ].filter((item) => Boolean(item.value));
  }

  if (stage === stages[2]) {
    return [
      { label: 'Температура', value: plant.adaptationTemperatureRequirement || plant.cloneTemperatureRequirement },
      { label: 'Освещение', value: plant.adaptationLightRequirement || plant.cloneLightRequirement },
      { label: 'Влажность', value: plant.adaptationHumidityRequirement || (plant.cloneHumidityRange && `${plant.cloneHumidityRange}%`) },
      { label: 'Профилактика', value: normalizeRecommendationText(plant.adaptationPreventionItems) },
    ].filter((item) => Boolean(item.value));
  }

  return [
    { label: 'Подкормки', value: plant.preventionFertilizers },
    { label: 'Препараты', value: plant.preventionChemicals },
    { label: 'Стимуляторы', value: plant.preventionStimulators },
    { label: 'Схема', value: plant.preventionApplicationRate },
    { label: 'Период', value: plant.preventionFrequency },
  ].filter((item) => Boolean(item.value));
}

export function buildRecommendationEntries({
  plantsCatalog,
  recommendationCard,
  recommendationMode,
  recommendationSourceCards,
  recommendationStage,
}) {
  if (recommendationCard && recommendationMode === 'all') {
    return stages.map((stage) => {
      const plant = findCatalogPlant(recommendationCard, plantsCatalog);

      return {
        key: `${recommendationCard.id}-${stage}`,
        plantKey: recommendationCard.id,
        subtitle: getCardDisplayName(recommendationCard),
        title: stage,
        items: getStagePlantRecommendationItems(plant, stage),
      };
    });
  }

  return recommendationSourceCards.reduce((entries, card) => {
    const plantKey = [
      card.cultureName,
      card.speciesName,
      card.varietyName,
    ].join('|');

    if (!recommendationCard && entries.some((entry) => entry.plantKey === plantKey)) {
      return entries;
    }

    const plant = findCatalogPlant(card, plantsCatalog);

    return [
      ...entries,
      {
        key: recommendationCard ? `${card.id}-${recommendationStage}` : plantKey,
        plantKey,
        subtitle: [
          plant?.originalName,
          recommendationCard ? recommendationStage : '',
        ].filter(Boolean).join(' В· '),
        title: getCardDisplayName(card),
        items: getStagePlantRecommendationItems(plant, recommendationStage),
      },
    ];
  }, []);
}
