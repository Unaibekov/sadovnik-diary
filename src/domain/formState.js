export function updateFormField(form, field, value) {
  return {
    ...form,
    [field]: value,
  };
}
