/**
 * Реестр object URL для превью картинок.
 *
 * Каждый URL, созданный через `URL.createObjectURL`, держит блоб в памяти, пока
 * его не отозвали. Превью пересоздаются на каждое переключение локации, поэтому
 * без реестра память течёт пропорционально числу переключений.
 *
 * Ключ — id файла, а не сам URL: у дубликата картинки свой id и свой URL, иначе
 * удаление оригинала погасило бы превью копии.
 */
const previewUrls = new Map<string, string>();

export const revokePreviewUrl = (id: string): void => {
  const url = previewUrls.get(id);
  if (!url) return;

  URL.revokeObjectURL(url);
  previewUrls.delete(id);
};

export const createPreviewUrl = (id: string, blob: Blob): string => {
  revokePreviewUrl(id);
  const url = URL.createObjectURL(blob);
  previewUrls.set(id, url);
  return url;
};

/** Отзывает превью всего, чего больше нет на сцене. */
export const revokePreviewUrlsExcept = (keptIds: Iterable<string>): void => {
  const kept = new Set(keptIds);

  previewUrls.forEach((url, id) => {
    if (kept.has(id)) return;

    URL.revokeObjectURL(url);
    previewUrls.delete(id);
  });
};

export const getPreviewUrlCount = (): number => previewUrls.size;
