import { beforeEach, describe, expect, it } from 'vitest';
import { adjustImageSizeToViewport, adjustRenderedImageDimensions } from './helpers';
import { DropzoneFile } from './types';

const setViewport = (width: number, height: number) => {
  window.innerWidth = width;
  window.innerHeight = height;
};

const makeFile = (overrides: Partial<DropzoneFile> = {}): DropzoneFile => ({
  id: 'file-1',
  preview: 'blob:preview',
  name: 'goblin.png',
  position: { x: 0, y: 0 },
  dimensions: { width: 100, height: 100 },
  imageType: 'normal',
  ...overrides,
});

/** Runs the state updater the way React would, and hands back the result. */
const applyUpdater = (files: DropzoneFile[]) => {
  let result = files;
  const setFunc = ((updater: unknown) => {
    result =
      typeof updater === 'function'
        ? (updater as (p: DropzoneFile[]) => DropzoneFile[])(result)
        : (updater as DropzoneFile[]);
  }) as unknown as Parameters<typeof adjustRenderedImageDimensions>[0]['setFunc'];

  return { setFunc, getResult: () => result };
};

beforeEach(() => {
  setViewport(1000, 800);
  document.body.innerHTML = '';
});

describe('adjustImageSizeToViewport', () => {
  it('fits a normal image into 80% of the viewport', () => {
    expect(adjustImageSizeToViewport(2000, 1000, false)).toEqual({ width: 800, height: 400 });
  });

  it('fits a battle image into the whole viewport', () => {
    expect(adjustImageSizeToViewport(2000, 1000, true)).toEqual({ width: 1000, height: 500 });
  });

  it('never upscales an image that already fits', () => {
    expect(adjustImageSizeToViewport(100, 50, false)).toEqual({ width: 100, height: 50 });
  });
});

describe('adjustRenderedImageDimensions', () => {
  it('leaves a file alone when its image is not in the DOM', () => {
    const files = [makeFile()];
    const { setFunc, getResult } = applyUpdater(files);

    expect(() => adjustRenderedImageDimensions({ setFunc })).not.toThrow();
    expect(getResult()).toEqual(files);
  });

  it('pulls an image back inside the viewport', () => {
    const file = makeFile({
      position: { x: 950, y: 750 },
      dimensions: { width: 100, height: 100 },
    });
    document.body.innerHTML = `<img data-image-id="${file.id}" />`;
    const img = document.querySelector('img') as HTMLImageElement;
    Object.defineProperty(img, 'offsetWidth', { value: 100 });
    Object.defineProperty(img, 'offsetHeight', { value: 100 });

    const { setFunc, getResult } = applyUpdater([file]);
    adjustRenderedImageDimensions({ setFunc });

    expect(getResult()[0].position).toEqual({ x: 900, y: 700 });
  });
});
