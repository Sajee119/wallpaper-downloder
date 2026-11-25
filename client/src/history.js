const LIMIT = 40;

function storageKey(userId) {
  return `pixelfall:downloads:${userId || 'guest'}`;
}

export function getDownloads(userId) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDownload(userId, item) {
  try {
    const entry = {
      slug: item.slug,
      title: item.title,
      category: item.category ?? '',
      thumbUrl: item.thumbUrl || item.url || '',
      width: item.width,
      height: item.height,
      at: new Date().toISOString(),
    };
    const next = [
      entry,
      ...getDownloads(userId).filter((row) => row.slug !== item.slug),
    ].slice(0, LIMIT);
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
    return next;
  } catch {
    return getDownloads(userId);
  }
}

export function clearDownloads(userId) {
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    /* storage may be blocked */
  }
}

const VIEW_LIMIT = 12;

function viewKey(userId) {
  return `pixelfall:views:${userId || 'guest'}`;
}

export function getViewed(userId) {
  try {
    const raw = window.localStorage.getItem(viewKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordView(userId, item) {
  if (!item?.id) return getViewed(userId);
  try {
    const entry = {
      id: item.id,
      slug: item.slug,
      title: item.title,
      category: item.category ?? '',
      thumbUrl: item.thumbUrl || item.url || '',
      width: item.width,
      height: item.height,
      at: new Date().toISOString(),
    };
    const next = [
      entry,
      ...getViewed(userId).filter((row) => row.slug !== item.slug),
    ].slice(0, VIEW_LIMIT);
    window.localStorage.setItem(viewKey(userId), JSON.stringify(next));
    window.dispatchEvent(new Event('pixelfall:viewed'));
    return next;
  } catch {
    return getViewed(userId);
  }
}

export function clearViewed(userId) {
  try {
    window.localStorage.removeItem(viewKey(userId));
  } catch {
    /* storage may be blocked */
  }
}
