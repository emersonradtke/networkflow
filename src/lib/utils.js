import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

// Formatar data/hora com timezone de Brasília
export const formatBrasiliaTz = (date, format = 'pt-BR') => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString(format, { timeZone: 'America/Sao_Paulo' });
};

// Formatar apenas data
export const formatDateBrasilia = (date, format = 'pt-BR') => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString(format, { timeZone: 'America/Sao_Paulo' });
};

// Formatar apenas hora
export const formatTimeBrasilia = (date, format = 'pt-BR') => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString(format, { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
};

export const isIframe = window.self !== window.top;