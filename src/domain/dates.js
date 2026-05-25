export function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = isoDate.split('-');

  if (!year || !month || !day) {
    return '';
  }

  return `${day}.${month}.${year}`;
}

export function formatDisplayDateTime(isoDateTime) {
  if (!isoDateTime) {
    return '';
  }

  const date = new Date(isoDateTime);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDisplayTime(isoDateTime) {
  if (!isoDateTime) {
    return '';
  }

  const date = new Date(isoDateTime);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseDisplayDate(displayDate) {
  const [day, month, year] = displayDate.split('.');

  if (!day || !month || !year) {
    return displayDate;
  }

  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function dateFromIso(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export function isoFromDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getMonthTitle(date) {
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let index = mondayFirstOffset; index > 0; index -= 1) {
    days.push(new Date(year, month, 1 - index));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  const trailingDaysCount = (7 - (days.length % 7)) % 7;

  for (let day = 1; day <= trailingDaysCount; day += 1) {
    days.push(new Date(year, month + 1, day));
  }

  return days;
}
