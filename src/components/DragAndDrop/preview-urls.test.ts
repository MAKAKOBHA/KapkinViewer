import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPreviewUrl,
  getPreviewUrlCount,
  revokePreviewUrl,
  revokePreviewUrlsExcept,
} from './preview-urls';

const revoked: string[] = [];

beforeEach(() => {
  revoked.length = 0;
  let counter = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => {
      counter += 1;
      return `blob:url-${counter}`;
    },
    revokeObjectURL: (url: string) => revoked.push(url),
  });
});

afterEach(() => {
  revokePreviewUrlsExcept([]);
  vi.unstubAllGlobals();
});

const blob = () => new Blob(['x']);

describe('preview urls', () => {
  it('hands out one url per file id', () => {
    const first = createPreviewUrl('a', blob());
    const second = createPreviewUrl('b', blob());

    expect(first).not.toBe(second);
    expect(getPreviewUrlCount()).toBe(2);
  });

  it('revokes the previous url when the same id is re-created', () => {
    const first = createPreviewUrl('a', blob());
    createPreviewUrl('a', blob());

    expect(revoked).toEqual([first]);
    expect(getPreviewUrlCount()).toBe(1);
  });

  it('revoking one file leaves its duplicate usable', () => {
    createPreviewUrl('original', blob());
    const copy = createPreviewUrl('duplicate', blob());

    revokePreviewUrl('original');

    expect(revoked).not.toContain(copy);
    expect(getPreviewUrlCount()).toBe(1);
  });

  it('drops everything that is no longer on the scene', () => {
    const gone = createPreviewUrl('gone', blob());
    createPreviewUrl('kept', blob());

    revokePreviewUrlsExcept(['kept']);

    expect(revoked).toEqual([gone]);
    expect(getPreviewUrlCount()).toBe(1);
  });

  it('ignores an unknown id', () => {
    expect(() => revokePreviewUrl('missing')).not.toThrow();
    expect(revoked).toEqual([]);
  });
});
