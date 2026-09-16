export function normalizeAssetUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;

  if (typeof window === 'undefined') {
    return pathOrUrl;
  }

  try {
    const parsed = new URL(pathOrUrl, window.location.origin);

    if (parsed.pathname.startsWith('/uploads/')) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    if (pathOrUrl.startsWith('/uploads/')) {
      return `${window.location.origin}${pathOrUrl}`;
    }

    return pathOrUrl;
  }
}
