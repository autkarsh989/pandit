const DEFAULT_BASE_URL = 'http://192.168.1.4:8000';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BASE_URL;

export const ASSET_BASE_URL =
  process.env.EXPO_PUBLIC_ASSET_BASE_URL?.trim() || API_BASE_URL;