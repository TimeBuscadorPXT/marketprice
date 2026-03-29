declare const __API_URL__: string | undefined;

export const API_BASE_URL =
  typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'http://localhost:3001/api';

export const BATCH_SIZE = 5;
export const BATCH_INTERVAL_MS = 10_000;

export const DEFECTIVE_KEYWORDS = [
  'pecas', 'peças', 'defeito', 'defeituoso',
  'tela quebrada', 'quebrado', 'quebrada',
  'nao liga', 'não liga', 'nao funciona', 'não funciona',
  'retirada de pecas', 'retirada de peças',
  'com problema', 'estragado', 'danificado',
  'display quebrado', 'trinco', 'trincado', 'trincada',
];

export const STORAGE_KEYS = {
  TOKEN: 'mp_token',
  REFRESH_TOKEN: 'mp_refresh_token',
  USER: 'mp_user',
  SESSION_STATS: 'mp_session_stats',
  IS_PAUSED: 'mp_is_paused',
  DEEP_CAPTURES: 'mp_deep_captures',
} as const;

export const MESSAGE_TYPES = {
  LISTINGS_CAPTURED: 'LISTINGS_CAPTURED',
  MARKETPLACE_DETECTED: 'MARKETPLACE_DETECTED',
  GET_STATUS: 'GET_STATUS',
  PAUSE_TOGGLE: 'PAUSE_TOGGLE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  STATUS_UPDATE: 'STATUS_UPDATE',
  DEEP_CAPTURE: 'DEEP_CAPTURE',
} as const;
