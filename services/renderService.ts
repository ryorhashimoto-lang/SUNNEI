
import { EditAction, CropConfig } from '../types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  originalCropped: string | null;
  personImage: string | null;
  appliedBg: EditAction | null;
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
 * AIが生成した画像から背景の緑色(#00FF00)を透過させる処理。
 */
const createTransparentCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const maxRB = Math.max(r, b);
    if (g > maxRB + 45) {
      data[i + 3] = 0;
    } else if (g > maxRB + 15) {
      const alpha = 1 - (g - (maxRB + 15)) / 30;
      data[i + 3] = 255 * Math.max(0, alpha);
      data[i + 1] = maxRB; 
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * 遺影をレンダリングするメイン関数。
 * 背景、人物、そして「最終トリミング（finalCropConfig）」を順に適用します。
 */
export const drawMemorialPhoto = async ({
  canvas,
  originalCropped,
  personImage,
  appliedBg,
  width,
  height,
  isHighRes = false,
  finalCropConfig = null
}: RenderOptions) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 一時的なバッファ用キャンバスを作成（トリミング前のフルサイズ描画用）
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const bCtx = buffer.getContext('2d');
  if (!bCtx) return;

  // --- 1. 背景レイヤー ---
  if (!appliedBg) {
    if (originalCropped) {
      const img = await loadImage(originalCropped);
      bCtx.drawImage(img, 0, 0, width, height);
    }
  } else {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX ** 2 + centerY ** 2);
    
    const gradient = bCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#FFFFFF'); // 中心は常に白

    switch (appliedBg) {
      case EditAction.REMOVE_BG_BLUE: gradient.addColorStop(1, '#BFEFFF'); break;
      case EditAction.REMOVE_BG_GRAY: gradient.addColorStop(1, '#D9D9D9'); break;
      case EditAction.REMOVE_BG_PINK: gradient.addColorStop(1, '#FFE4E8'); break;
      case EditAction.REMOVE_BG_YELLOW: gradient.addColorStop(1, '#FEF3D1'); break;
      case EditAction.REMOVE_BG_PURPLE: gradient.addColorStop(1, '#F3E5F5'); break;
      case EditAction.REMOVE_BG_WHITE: gradient.addColorStop(1, '#F2F2F2'); break; // シルキーホワイト
      default: gradient.addColorStop(1, '#FFFFFF'); break;
    }
    
    bCtx.fillStyle = gradient;
    bCtx.fillRect(0, 0, width, height);
  }

  // --- 2. 人物レイヤー ---
  if (personImage) {
    const personImg = await loadImage(personImage);
    const transparentPerson = createTransparentCanvas(personImg);
    bCtx.drawImage(transparentPerson, 0, 0, width, height);
  }

  // --- 3. 最終トリミングの適用と出力キャンバスへの描画 ---
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (finalCropConfig) {
    ctx.save();
    // 中心を基準に変換を適用
    ctx.translate(width / 2, height / 2);
    ctx.rotate((finalCropConfig.rotation * Math.PI) / 180);
    
    // CropToolでの座標系をレンダリングサイズにスケール
    const drawW = width * finalCropConfig.scale;
    const drawH = height * finalCropConfig.scale;
    const dx = finalCropConfig.offsetX * (width / 800); 
    const dy = finalCropConfig.offsetY * (height / 1066);

    ctx.drawImage(buffer, dx - drawW / 2, dy - drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    // 最終トリミングがない場合はそのまま描画
    ctx.drawImage(buffer, 0, 0, width, height);
  }

  // --- 4. 装飾フレーム ---
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
