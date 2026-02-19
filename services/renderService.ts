
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
  // Fix: Use "Object Fit: Cover" logic to prevent stretching
  // AI usually returns 3:4, but canvas is 5:6.
  const imgAspect = sourceImg.width / sourceImg.height;
  const canvasAspect = width / height;
  
  let drawX, drawY, drawW, drawH;

  if (imgAspect < canvasAspect) {
     // Image is taller/thinner than canvas -> Match Width, Crop Height
     drawW = width;
     drawH = width / imgAspect;
     drawX = 0;
     drawY = (height - drawH) / 2; // Center vertical
  } else {
     // Image is wider than canvas -> Match Height, Crop Width
     drawH = height;
     drawW = height * imgAspect;
     drawX = (width - drawW) / 2; // Center horizontal
     drawY = 0;
  }

  // Draw source image to buffer with cropping (no stretching)
  bCtx.imageSmoothingEnabled = true;
  bCtx.imageSmoothingQuality = 'high';
  bCtx.drawImage(sourceImg, drawX, drawY, drawW, drawH);

  // Output canvas settings
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (finalCropConfig) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((finalCropConfig.rotation * Math.PI) / 180);
    
    // finalCropConfig values are normalized relative to width/height
    const cropDrawW = width * finalCropConfig.scale;
    const cropDrawH = height * finalCropConfig.scale;
    
    // Offset is fraction of width/height
    const dx = finalCropConfig.offsetX * width;
    const dy = finalCropConfig.offsetY * height;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buffer, dx - cropDrawW / 2, dy - cropDrawH / 2, cropDrawW, cropDrawH);
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
