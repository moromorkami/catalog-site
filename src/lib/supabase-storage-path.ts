function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(value, "http://localhost");
    } catch {
      return null;
    }
  }
}

export function getSupabaseStoragePathFromUrl(
  fileUrl: string,
  bucket: string,
): string | null {
  const parsed = tryParseUrl(fileUrl.trim());
  if (!parsed) {
    return null;
  }

  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
  ];

  for (const marker of markers) {
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      continue;
    }

    const rawPath = parsed.pathname.slice(markerIndex + marker.length);
    if (!rawPath) {
      return null;
    }

    return decodeURIComponent(rawPath);
  }

  return null;
}
