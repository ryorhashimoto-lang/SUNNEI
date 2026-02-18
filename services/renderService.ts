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
 * 遺影をレンダリングする。
 * 背景合成はAI（Gemini）が行うため、プログラムによるクロマキー処理は不要です。
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

  // 一時バッファ
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const bCtx = buffer.getContext('2d');
  if (!bCtx) return;

  // AI生成画像（背景込み）をフル描画
  bCtx.drawImage(sourceImg, 0, 0, width, height);

  // 出力キャンバス設定
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

  // 装飾フレーム（品位を高める薄い枠）
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
