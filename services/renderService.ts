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
 * Background synthesis is handled by AI (Gemini), so programmatic chroma key processing is not required.
 */
export const drawMemorialPhoto = async ({
  canvas,
  originalCropped,
  personImage,
  width,
  height,
  isHighRes = false,
  finalCropConfig = null
}: RenderOptions) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sourceSrc = personImage || originalCropped;
  if (!sourceSrc) return;

  const sourceImg = await loadImage(sourceSrc);

  // Temporary buffer
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const bCtx = buffer.getContext('2d');
  if (!bCtx) return;

  // Draw AI generated image (with background)
  bCtx.drawImage(sourceImg, 0, 0, width, height);

  // Output canvas settings
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (finalCropConfig) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((finalCropConfig.rotation * Math.PI) / 180);
    
    // finalCropConfig values are normalized relative to width/height
    const drawW = width * finalCropConfig.scale;
    const drawH = height * finalCropConfig.scale;
    
    // Offset is fraction of width/height
    const dx = finalCropConfig.offsetX * width;
    const dy = finalCropConfig.offsetY * height;

    ctx.drawImage(buffer, dx - drawW / 2, dy - drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(buffer, 0, 0, width, height);
  }

  // Decorative frame (thin line to enhance quality)
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
