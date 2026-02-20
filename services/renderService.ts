
import { CropConfig } from '../types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  originalCropped: string | null;
  personImage: string | null;
  width: number;
  height: number;
  isHighRes?: boolean;
  finalCropConfig?: CropConfig | null;
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Renders the memorial photo.
 */
export const drawMemorialPhoto = async ({
  canvas,
  originalCropped,
  personImage,
  width,
  height,
  isHighRes = false,
  finalCropConfig = null,
}: RenderOptions) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  // Load Images
  // If AI image exists, that's our base. If not, we use the original.
  const baseImageSrc = personImage || originalCropped;
  if (!baseImageSrc) return;

  const baseImg = await loadImage(baseImageSrc);

  // --- Helper to calculate "Cover" fit ---
  // Calculates coordinates to draw 'img' into 'targetW/H' using object-fit: cover logic
  const getCoverCoords = (imgW: number, imgH: number, targetW: number, targetH: number) => {
    const imgAspect = imgW / imgH;
    const canvasAspect = targetW / targetH;
    let drawX, drawY, drawW, drawH;

    if (imgAspect < canvasAspect) {
      // Image is taller/thinner -> Match Width, Crop Height
      drawW = targetW;
      drawH = targetW / imgAspect;
      drawX = 0;
      drawY = (targetH - drawH) / 2; 
    } else {
      // Image is wider -> Match Height, Crop Width
      drawH = targetH;
      drawW = targetH * imgAspect;
      drawX = (targetW - drawW) / 2;
      drawY = 0;
    }
    return { drawX, drawY, drawW, drawH };
  };

  // 1. Draw the Base Image (AI Body or Original)
  const baseCoords = getCoverCoords(baseImg.width, baseImg.height, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(baseImg, baseCoords.drawX, baseCoords.drawY, baseCoords.drawW, baseCoords.drawH);

  // 2. Final Crop (if applied via CropTool for output)
  if (finalCropConfig) {
    // We need to re-process the whole canvas content through the crop config.
    // The easiest way is to copy the current canvas to a buffer, clear, and draw back with transform.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx?.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((finalCropConfig.rotation * Math.PI) / 180);

    const cropDrawW = width * finalCropConfig.scale;
    const cropDrawH = height * finalCropConfig.scale;
    const dx = finalCropConfig.offsetX * width;
    const dy = finalCropConfig.offsetY * height;

    ctx.drawImage(tempCanvas, dx - cropDrawW / 2, dy - cropDrawH / 2, cropDrawW, cropDrawH);
    ctx.restore();
  }

  // 3. Decorative Frame
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
