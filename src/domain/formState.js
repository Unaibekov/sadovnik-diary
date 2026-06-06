// Базовые операции обновления состояния формы.
export function updateFormField(form, field, value) {
  return {
    ...form,
    [field]: value,
  };
}
