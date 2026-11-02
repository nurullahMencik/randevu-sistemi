/** API base URL without a trailing slash, from VITE_API_URL. */
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5305').replace(/\/+$/, '')

export const BUSINESS_TIME_ZONE = 'Europe/Istanbul'
