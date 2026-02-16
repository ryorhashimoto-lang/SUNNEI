
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

interface Point {
  x: number;
  y: number;
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
 * 画像内の「瞳」の推定中心座標をより堅牢に検出する
 * 単純な暗点探索ではなく、領域内の「輝度重み付き重心（Centroid）」を計算することでノイズ耐性を高める
 */
const findEyeCenters = (img: HTMLImageElement, width: number, height: number): { left: Point, right: Point } => {
  const canvas = document.createElement('canvas');
  const internalWidth = 200;
  const internalHeight = 266;
  canvas.width = internalWidth;
  canvas.height = internalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  const defaultLeft = { x: width * 0.4, y: height * 0.4 };
  const defaultRight = { x: width * 0.6, y: height * 0.4 };
  
  if (!ctx) return { left: defaultLeft, right: defaultRight };

  ctx.drawImage(img, 0, 0, internalWidth, internalHeight);
  const data = ctx.getImageData(0, 0, internalWidth, internalHeight).data;

  const findCentroidInRect = (rx: number, ry: number, rw: number, rh: number): Point => {
    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;

    for (let y = Math.floor(ry); y < Math.floor(ry + rh); y++) {
      for (let x = Math.floor(rx); x < Math.floor(rx + rw); x++) {
        const idx = (y * internalWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        // 瞳らしい「暗いピクセル」を重視
        if (brightness < 90) {
          const weight = (255 - brightness) ** 2; // 暗いほど指数関数的に重みを付ける
          sumX += x * weight;
          sumY += y * weight;
          totalWeight += weight;
        }
      }
    }

    if (totalWeight === 0) return { x: (rx + rw / 2) / internalWidth * width, y: (ry + rh / 2) / internalHeight * height };
    
    return { 
      x: (sumX / totalWeight) / internalWidth * width, 
      y: (sumY / totalWeight) / internalHeight * height 
    };
  };

  // 3:4比率の一般的な顔の位置範囲で重心を計算
  const leftEye = findCentroidInRect(internalWidth * 0.3, internalHeight * 0.33, internalWidth * 0.2, internalHeight * 0.14);
  const rightEye = findCentroidInRect(internalWidth * 0.5, internalHeight * 0.33, internalWidth * 0.2, internalHeight * 0.14);

  return { left: leftEye, right: rightEye };
};

/**
 * 瞳の位置に基づき、動的なパーツマスクを作成する（フェザリングを強化）
 */
const createDynamicPartsMask = (width: number, height: number, leftEye: Point, rightEye: Point): HTMLCanvasElement => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) return maskCanvas;

  const drawPart = (pt: Point, rx: number, ry: number) => {
    mctx.save();
    mctx.translate(pt.x, pt.y);
    const grad = mctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    mctx.scale(1, ry / rx);
    mctx.fillStyle = grad;
    mctx.beginPath();
    mctx.arc(0, 0, rx, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  };

  const eyeDist = Math.sqrt((rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2);
  const eyeRadiusX = eyeDist * 0.28;
  const eyeRadiusY = eyeRadiusX * 0.65;

  drawPart(leftEye, eyeRadiusX, eyeRadiusY);
  drawPart(rightEye, eyeRadiusX, eyeRadiusY);

  const mouthPos = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2 + (eyeDist * 0.8)
  };
  drawPart(mouthPos, eyeDist * 0.4, eyeDist * 0.25);

  return maskCanvas;
};

/**
 * 緑色(#00FF00)を透過させる処理
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
    } else if (g > maxRB + 10) {
      const alpha = 1 - (g - (maxRB + 10)) / 35;
      data[i + 3] = 255 * Math.max(0, alpha);
      data[i + 1] = maxRB;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

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

  // 1. 背景描画
  if (!appliedBg) {
    if (originalCropped) {
      const img = await loadImage(originalCropped);
      ctx.drawImage(img, 0, 0, width, height);
    }
  } else {
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

  // 2. 合成処理 (生成画像=AIを正とする「逆転アライメント」)
  if (personImage && originalCropped) {
    const personImg = await loadImage(personImage);
    const originalImg = await loadImage(originalCropped);
    
    // AI画像の瞳位置（これが「正」のターゲット）
    const aiEyes = findEyeCenters(personImg, width, height);
    // 元画像の瞳位置（ここからターゲットへ移動させる）
    const origEyes = findEyeCenters(originalImg, width, height);
    
    // AI画像を先に描画
    const transparentPerson = createTransparentCanvas(personImg);
    ctx.drawImage(transparentPerson, 0, 0, width, height);

    // 3. 安全装置付きアライメント
    const aiMid = { x: (aiEyes.left.x + aiEyes.right.x) / 2, y: (aiEyes.left.y + aiEyes.right.y) / 2 };
    const origMid = { x: (origEyes.left.x + origEyes.right.x) / 2, y: (origEyes.left.y + origEyes.right.y) / 2 };
    
    const aiDist = Math.sqrt((aiEyes.right.x - aiEyes.left.x) ** 2 + (aiEyes.right.y - aiEyes.left.y) ** 2);
    const origDist = Math.sqrt((origEyes.right.x - origEyes.left.x) ** 2 + (origEyes.right.y - origEyes.left.y) ** 2);
    
    // --- セーフティガード (暴走防止) ---
    // 1. スケールの制限 (±5%以内)
    let scale = aiDist / origDist;
    scale = Math.max(0.95, Math.min(1.05, scale));
    
    // 2. 回転角の制限 (±3度以内)
    const aiAngle = Math.atan2(aiEyes.right.y - aiEyes.left.y, aiEyes.right.x - aiEyes.left.x);
    const origAngle = Math.atan2(origEyes.right.y - origEyes.left.y, origEyes.right.x - origEyes.left.x);
    let rotation = aiAngle - origAngle;
    const maxRot = 3 * (Math.PI / 180);
    rotation = Math.max(-maxRot, Math.min(maxRot, rotation));

    // 元の顔パーツをAIの顔に吸着させる
    const partsMask = createDynamicPartsMask(width, height, aiEyes.left, aiEyes.right);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tctx = tempCanvas.getContext('2d');
    
    if (tctx) {
      tctx.drawImage(partsMask, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      
      tctx.save();
      // AIの座標系に移動
      tctx.translate(aiMid.x, aiMid.y);
      tctx.rotate(rotation);
      tctx.scale(scale, scale);
      // オリジナルの中心を合わせる
      tctx.drawImage(originalImg, -origMid.x, -origMid.y, width, height);
      tctx.restore();
      
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  // 4. 装飾フレーム
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHighRes ? 60 : 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = isHighRes ? 20 : 4;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
};
