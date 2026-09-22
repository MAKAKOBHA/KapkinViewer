import { LayerItem } from './types';

export const INITIAL_LAYERS: LayerItem[] = [{ id: 'layer-1', name: 'Default' }];

export const STORAGE_LAYERS_KEY = 'LayersList';
export const STORAGE_ACTIVE_LAYER_KEY = 'ActiveLayer';

const isLayerList = (value: unknown): value is LayerItem[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as LayerItem).id === 'string' &&
      typeof (item as LayerItem).name === 'string',
  );

/**
 * Локаций всегда хотя бы одна: без активной локации приложению негде хранить
 * файлы, фон и рисунок, поэтому любой непригодный ввод откатывается к дефолту.
 */
export const getInitialLayers = (): LayerItem[] => {
  const rawLayers = localStorage.getItem(STORAGE_LAYERS_KEY);
  if (!rawLayers) return INITIAL_LAYERS;

  try {
    const parsed: unknown = JSON.parse(rawLayers);
    return isLayerList(parsed) && parsed.length > 0 ? parsed : INITIAL_LAYERS;
  } catch {
    return INITIAL_LAYERS;
  }
};

/** Сохранённый id может указывать на удалённую локацию — тогда берём первую. */
export const getInitialActiveId = (layers: LayerItem[]): string => {
  const fallback = layers[0]?.id ?? INITIAL_LAYERS[0].id;
  const raw = localStorage.getItem(STORAGE_ACTIVE_LAYER_KEY);
  if (!raw) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'string') return fallback;
    return layers.some((layer) => layer.id === parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Удаление локации: возвращает новый список вместе с активным id.
 * `null` означает, что удалять нечего — последнюю локацию убрать нельзя.
 */
export const removeLayer = (
  layers: LayerItem[],
  idToRemove: string,
  activeId: string,
): { layers: LayerItem[]; activeId: string } | null => {
  if (layers.length <= 1) return null;
  if (!layers.some((layer) => layer.id === idToRemove)) return null;

  const nextLayers = layers.filter((layer) => layer.id !== idToRemove);

  return {
    layers: nextLayers,
    activeId: activeId === idToRemove ? nextLayers[0].id : activeId,
  };
};
