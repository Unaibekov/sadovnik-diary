export function buildLoginState() {
  return {
    error: '',
    notice: '',
    isAuthenticated: true,
  };
}

export function buildForgotPasswordState() {
  return {
    error: '',
    notice: 'Восстановление пароля будет добавлено на следующем шаге.',
  };
}

export function buildRegisterState() {
  return {
    error: '',
    notice: 'Регистрация будет добавлена отдельно. Роль назначает суперадминистратор.',
  };
}
