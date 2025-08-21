export const validationRules = {
  email: {
    required: 'Email обязателен для заполнения',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Введите корректный email адрес',
    },
  },
  password: {
    required: 'Пароль обязателен для заполнения',
    minLength: {
      value: 8,
      message: 'Пароль должен содержать минимум 8 символов',
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      message: 'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру',
    },
  },
  confirmPassword: (password: string) => ({
    required: 'Подтверждение пароля обязательно',
    validate: (value: string) => value === password || 'Пароли не совпадают',
  }),
  firstName: {
    required: 'Имя обязательно для заполнения',
    minLength: {
      value: 2,
      message: 'Имя должно содержать минимум 2 символа',
    },
    maxLength: {
      value: 50,
      message: 'Имя не должно превышать 50 символов',
    },
  },
  lastName: {
    required: 'Фамилия обязательна для заполнения',
    minLength: {
      value: 2,
      message: 'Фамилия должна содержать минимум 2 символа',
    },
    maxLength: {
      value: 50,
      message: 'Фамилия не должна превышать 50 символов',
    },
  },
};

export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Произошла неизвестная ошибка';
};