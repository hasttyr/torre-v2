import { createI18n } from 'vue-i18n';
import es from '../locales/es.json';

/** Spanish first; English and Portuguese come later (DEC-019, US-075). */
export const DEFAULT_LOCALE = 'es';

export type MessageSchema = typeof es;

export function createAppI18n() {
  return createI18n<[MessageSchema], 'es'>({
    legacy: false,
    locale: DEFAULT_LOCALE,
    fallbackLocale: DEFAULT_LOCALE,
    messages: { es },
  });
}
