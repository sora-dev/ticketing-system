// Prefer same-origin to avoid mixed content when site is served over HTTPS.
// If REACT_APP_API_URL is set, use it; otherwise default to the page origin.
const origin = typeof window !== 'undefined' ? window.location.origin : '';
export const API_BASE_URL = (process.env.REACT_APP_API_URL || origin).replace(/\/$/, '');