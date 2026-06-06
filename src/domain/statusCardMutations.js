// Частичные изменения карточки для операций по статусам.
export function getGreenhouseCareIntervalsPatch(card, introActionType, statusForm) {
  if (introActionType !== 'greenhouseCare' || !statusForm.careType.trim()) {
    return {};
  }

  const careType = statusForm.careType.trim();

  return {
    greenhouseCareIntervals: {
      ...(card.greenhouseCareIntervals || {}),
      [careType]: statusForm.careIntervalDays.trim() ||
        statusForm.wateringIntervalDays.trim() ||
        card.greenhouseCareIntervals?.[careType],
    },
  };
}
