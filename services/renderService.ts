
import { EditAction } from '../types';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  originalCropped: string | null;
  personImage: string | null;
  appliedBg: EditAction | null;
  width: number;
  height: number;
  isHighRes?: boolean;
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
 * エッジのジャギーを抑えるため、クロマキー合成のアルゴリズムを使用。
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
    
    // 緑色の判定基準（#00FF00付近を検出し、アルファ値を操作）
    const maxRB = Math.max(r, b);
    if (g > maxRB + 45) {
      data[i + 3] = 0; // 完全透過
    } else if (g > maxRB + 15) {
      // 境界線のソフト処理
      const alpha = 1 - (g - (maxRB + 15)) / 30;
      data[i + 3] = 255 * Math.max(0, alpha);
      // 残った緑かぶりを抑制（グレースケール化に近い処理で肌色を保護）
      data[i + 1] = maxRB; 
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * 遺影をレンダリングするメイン関数。
 * 「背景レイヤー」の上に「人物レイヤー」を重ねるだけのシンプルで堅牢な構造。
 */
export const drawMemorialPhoto = async ({
  canvas,
  originalCropped,
  personImage,
  appliedBg,
  width,
  height,
  isHighRes = false
}: RenderOptions) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;

  // --- 1. 背景レイヤーの描画 ---
  if (!appliedBg) {
    // 背景加工なしの場合は元のトリミング画像をそのまま使用
    if (originalCropped) {
      const img = await loadImage(originalCropped);
      ctx.drawImage(img, 0, 0, width, height);
    }
  } else {
    // 指定された背景色またはグラデーションを描画
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX ** 2 + centerY ** 2);
    
    if (appliedBg === EditAction.REMOVE_BG_WHITE) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#ffffff');
      switch (appliedBg) {
        case EditAction.REMOVE_BG_BLUE: gradient.addColorStop(1, '#bfdbfe'); break;
        case EditAction.REMOVE_BG_GRAY: gradient.addColorStop(1, '#d1d5db'); break;
        case EditAction.REMOVE_BG_PINK: gradient.addColorStop(1, '#fbcfe8'); break;
        case EditAction.REMOVE_BG_YELLOW: gradient.addColorStop(1, '#fef3c7'); break;
        case EditAction.REMOVE_BG_PURPLE: gradient.addColorStop(1, '#e9d5ff'); break;
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // --- 2. 人物レイヤーの描画 ---
  if (personImage) {
    // AI処理済みの画像がある場合（背景除去後、または着せ替え後）
    const personImg = await loadImage(personImage);
    const transparentPerson = createTransparentCanvas(personImg);
    
    // AIの出力をそのまま描画（位置合わせはAIのプロンプト制御に任せる）
    ctx.drawImage(transparentPerson, 0, 0, width, height);
  } else if (!appliedBg && originalCropped) {
    // AI処理前で、背景も変更していない場合（初期状態）
    // すでに手順1で描画済みのため何もしない
  }

  // --- 3. 装飾フレーム（遺影らしさの演出） ---
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
