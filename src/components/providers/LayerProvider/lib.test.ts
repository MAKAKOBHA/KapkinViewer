import { describe, expect, it } from 'vitest';
import {
  getInitialActiveId,
  getInitialLayers,
  INITIAL_LAYERS,
  removeLayer,
  STORAGE_ACTIVE_LAYER_KEY,
  STORAGE_LAYERS_KEY,
} from './lib';

describe('getInitialLayers', () => {
  it('returns the default layer when nothing is stored', () => {
    expect(getInitialLayers()).toEqual(INITIAL_LAYERS);
  });

  it('returns the default layer when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_LAYERS_KEY, '{oops');
    expect(getInitialLayers()).toEqual(INITIAL_LAYERS);
  });

  it('returns the default layer when the stored list is empty', () => {
    localStorage.setItem(STORAGE_LAYERS_KEY, '[]');
    expect(getInitialLayers()).toEqual(INITIAL_LAYERS);
  });

  it('returns the default layer when the stored value is not a list', () => {
    localStorage.setItem(STORAGE_LAYERS_KEY, '{"id":"layer-1"}');
    expect(getInitialLayers()).toEqual(INITIAL_LAYERS);
  });

  it('returns the stored layers', () => {
    const stored = [
      { id: 'a', name: 'Таверна' },
      { id: 'b', name: 'Подземелье' },
    ];
    localStorage.setItem(STORAGE_LAYERS_KEY, JSON.stringify(stored));
    expect(getInitialLayers()).toEqual(stored);
  });
});

describe('getInitialActiveId', () => {
  const layers = [
    { id: 'a', name: 'Таверна' },
    { id: 'b', name: 'Подземелье' },
  ];

  it('falls back to the first layer when nothing is stored', () => {
    expect(getInitialActiveId(layers)).toBe('a');
  });

  it('returns the stored id when it still exists', () => {
    localStorage.setItem(STORAGE_ACTIVE_LAYER_KEY, JSON.stringify('b'));
    expect(getInitialActiveId(layers)).toBe('b');
  });

  it('falls back to the first layer when the stored id is gone', () => {
    localStorage.setItem(STORAGE_ACTIVE_LAYER_KEY, JSON.stringify('deleted'));
    expect(getInitialActiveId(layers)).toBe('a');
  });

  it('falls back to the first layer when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_ACTIVE_LAYER_KEY, '{oops');
    expect(getInitialActiveId(layers)).toBe('a');
  });
});

describe('removeLayer', () => {
  const layers = [
    { id: 'a', name: 'Таверна' },
    { id: 'b', name: 'Подземелье' },
    { id: 'c', name: 'Лес' },
  ];

  it('removes the layer and keeps the active one untouched', () => {
    expect(removeLayer(layers, 'c', 'a')).toEqual({
      layers: [layers[0], layers[1]],
      activeId: 'a',
    });
  });

  it('moves the selection to the first remaining layer when the active one is removed', () => {
    expect(removeLayer(layers, 'a', 'a')).toEqual({
      layers: [layers[1], layers[2]],
      activeId: 'b',
    });
  });

  it('refuses to remove the last layer', () => {
    const single = [layers[0]];
    expect(removeLayer(single, 'a', 'a')).toBeNull();
  });

  it('returns null when the layer is unknown', () => {
    expect(removeLayer(layers, 'missing', 'a')).toBeNull();
  });
});
