async function request(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep the status message */
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function fetchWallpapers(
  { category, q, sort, page = 1, limit = 12, ids = [], device = '' },
  signal,
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
  if (category && category !== 'All') params.set('category', category);
  if (q) params.set('q', q);
  if (ids.length > 0) params.set('ids', ids.join(','));
  if (device) params.set('device', device);
  return request(`/api/wallpapers?${params.toString()}`, { signal });
}

export const fetchSuggestions = (q, signal) =>
  request(`/api/suggestions?q=${encodeURIComponent(q)}`, { signal });

export const fetchFeatured = () => request('/api/featured');

export const fetchCategories = () => request('/api/categories');

export const fetchWallpaper = (slug, signal) =>
  request(`/api/wallpapers/${encodeURIComponent(slug)}`, { signal });

export function fetchRandom(category, signal) {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.set('category', category);
  const suffix = params.toString();
  return request(`/api/wallpapers/random${suffix ? `?${suffix}` : ''}`, { signal });
}

export const downloadWallpaper = (slug) =>
  request(`/api/wallpapers/${encodeURIComponent(slug)}/download`, { method: 'POST' });

export const fetchSettings = () => request('/api/settings');

export const sendMessage = (payload) =>
  request('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
