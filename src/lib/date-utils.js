/**
 * Utilitários de formatação de data/hora no fuso horário de Brasília (America/Sao_Paulo).
 */

const TZ = 'America/Sao_Paulo';
const LOCALE = 'pt-BR';

/** "dd/mm/aaaa" */
export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(LOCALE, { timeZone: TZ });
}

/** "dd/mm/aaaa HH:MM" */
export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(LOCALE, {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** "HH:MM" */
export function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString(LOCALE, { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

/** "Jan 2025" */
export function formatMonthYear(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(LOCALE, { timeZone: TZ, month: 'short', year: 'numeric' });
}

/** "5 de junho de 2026" */
export function formatDateLong(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(LOCALE, { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
}