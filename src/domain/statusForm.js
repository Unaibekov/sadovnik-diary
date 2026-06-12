// Доступ к полям комментария и параметров формы статуса.
export function getStatusFormComment(operation) {
  return operation?.comment || '';
}
