export type Locale = 'en' | 'gu' | 'hi';
export type TranslationKey = string;

export const translations = {
  get en() { return require('./en').default; },
  get gu() { return require('./gu').default; },
  get hi() { return require('./hi').default; }
} as const;
