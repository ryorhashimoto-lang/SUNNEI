
import { CropConfig } from '../types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  currentImage: string | null;
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
 * 遺影をレンダリングするメイン関数。
 * AI一括合成方式により、AIが生成した画像をそのまま描画し、
 * 装飾フレームや最終トリミングを適用します。
 */
export const drawMemorialPhoto = async ({
  canvas,
  currentImage,
  width,
  height,
  isHighRes = false,
  finalCropConfig = null
}: RenderOptions) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const bCtx = buffer.getContext('2d');
  if (!bCtx) return;

  // --- 1. ベース画像（AI生成済み画像）の描画 ---
  if (currentImage) {
    const img = await loadImage(currentImage);
    bCtx.drawImage(img, 0, 0, width, height);
  }

  // --- 2. 最終出力 (トリミング・回転の適用) ---
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (finalCropConfig) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((finalCropConfig.rotation * Math.PI) / 180);
    
    const drawW = width * finalCropConfig.scale;
    const drawH = height * finalCropConfig.scale;
    const dx = finalCropConfig.offsetX * (width / 800); 
    const dy = finalCropConfig.offsetY * (height / 1066);

    ctx.drawImage(buffer, dx - drawW / 2, dy - drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(buffer, 0, 0, width, height);
  }

  // --- 3. 装飾フレーム ---
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
