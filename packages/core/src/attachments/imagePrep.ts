// An image as the model receives it: drawn again in the page at 1568 pixels on its long side at most, the
// size Anthropic's docs recommend (https://platform.claude.com/docs/en/build-with-claude/vision), and
// encoded as WebP, or as JPEG in a browser whose canvas does not write WebP. Drawing it again drops its
// metadata, the GPS position of a photo included.

import type { ImagePart } from '../types.ts';

export const IMAGE_LONG_SIDE = 1568;

const QUALITY = 0.86;

// A file the browser could not read as an image, such as a HEIC photo in a browser without HEIC.
export class UnreadableFileError extends Error {
  constructor(name: string) {
    super(`The browser could not read ${name}`);
    this.name = 'UnreadableFileError';
  }
}

export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

// A canvas of the given size with the image drawn on it, on white when the encoding has no transparency.
export function drawnCanvas(source: CanvasImageSource, width: number, height: number, opaque = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The browser gave no 2D canvas');
  }
  if (opaque) {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

// The image source as a WebP image, or a JPEG one where the browser writes no WebP.
export async function encodedImage(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const webp = await canvasBlob(drawnCanvas(source, width, height), 'image/webp');
  if (webp?.type === 'image/webp') {
    return webp;
  }
  const jpeg = await canvasBlob(drawnCanvas(source, width, height, true), 'image/jpeg');
  if (!jpeg) {
    throw new Error('The browser could not encode the image');
  }
  return jpeg;
}

// The size of an image scaled down to the long side, never up.
export function fittedSize(width: number, height: number, longSide = IMAGE_LONG_SIDE) {
  const scale = Math.min(1, longSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function preparedImage(file: File): Promise<ImagePart> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new UnreadableFileError(file.name);
  });
  try {
    const { width, height } = fittedSize(bitmap.width, bitmap.height);
    return { type: 'image', url: await blobDataUrl(await encodedImage(bitmap, width, height)) };
  } finally {
    bitmap.close();
  }
}
