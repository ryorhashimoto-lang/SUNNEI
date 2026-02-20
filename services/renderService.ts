
import { CropConfig } from '../types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  originalCropped: string | null;
  personImage: string | null;
  width: number;
  height: number;
  isHighRes?: boolean;
  finalCropConfig?: CropConfig | null;
  isHybridMode?: boolean; // New flag for face protection
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
 * Now supports "Hybrid Mode" to graft the original face onto the AI body.
 */
export const drawMemorialPhoto = async ({
  canvas,
  originalCropped,
  personImage,
  width,
  height,
  isHighRes = false,
  finalCropConfig = null,
  isHybridMode = false
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

  // 2. Hybrid Mode: Overlay Original Face
  // Only execute if we have an AI image (personImage) AND hybrid mode is active AND we have the original.
  if (personImage && originalCropped && isHybridMode) {
    const originalImg = await loadImage(originalCropped);
    
    // Create an offscreen canvas for the face layer
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = width;
    faceCanvas.height = height;
    const fCtx = faceCanvas.getContext('2d');

    if (fCtx) {
      // Draw the original image onto the face layer (using same cover coords as base)
      // Since originalCropped was the input to AI, their compositions should be nearly identical.
      const origCoords = getCoverCoords(originalImg.width, originalImg.height, width, height);
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.drawImage(originalImg, origCoords.drawX, origCoords.drawY, origCoords.drawW, origCoords.drawH);

      // Create the Alpha Mask (Feathering)
      fCtx.globalCompositeOperation = 'destination-in';
      
      // Mask Geometry:
      // We assume the face is roughly in the center of the cropped image.
      // We create a radial gradient that is opaque in the center and transparent at the edges.
      // Position: Center horizontally, slightly above center vertically (typical portrait composition).
      const centerX = width / 2;
      const centerY = height * 0.45; 
      const radiusInner = Math.min(width, height) * 0.25; // Face area
      const radiusOuter = Math.min(width, height) * 0.55; // Fade out to neck/hair

      const gradient = fCtx.createRadialGradient(centerX, centerY, radiusInner, centerX, centerY, radiusOuter);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Opaque (Keep original face)
      gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)'); // Start fading
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent (Show AI body)

      fCtx.fillStyle = gradient;
      fCtx.fillRect(0, 0, width, height);

      // Reset composite and draw the masked face onto the main canvas
      fCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(faceCanvas, 0, 0);
    }
  }

  // 3. Final Crop (if applied via CropTool for output)
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

  // 4. Decorative Frame
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
