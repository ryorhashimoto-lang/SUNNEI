
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropConfig } from '../types';

interface CropToolProps {
  imageSrc: string;
  initialConfig?: CropConfig | null;
  onConfirm: (croppedImage: string, config: CropConfig) => void;
  onCancel: () => void;
}

const ASPECT_RATIO = 3 / 4;

const CropTool: React.FC<CropToolProps> = ({ imageSrc, initialConfig, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const DEFAULT_SCALE = 0.8;
  const DEFAULT_OFFSET = { x: 0, y: 0 };
  const DEFAULT_ROTATION = 0;

  const [scale, setScale] = useState(initialConfig?.scale ?? DEFAULT_SCALE);
  const [offset, setOffset] = useState({ 
    x: initialConfig?.offsetX ?? DEFAULT_OFFSET.x, 
    y: initialConfig?.offsetY ?? DEFAULT_OFFSET.y 
  });
  const [rotation, setRotation] = useState(initialConfig?.rotation ?? DEFAULT_ROTATION);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
  
  // ピンチズーム用の状態
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const onImageLoad = () => {
    if (initialConfig) return;
    handleFit();
  };

  // ワンタップ調整: 枠内に収める
  const handleFit = () => {
    setScale(0.7); // 遺影として少し余裕を持たせた標準的なサイズ
    setOffset(DEFAULT_OFFSET);
  };

  // ワンタップ調整: 枠をいっぱいに埋める
  const handleFill = () => {
    setScale(1.1); // 余白を消して力強い構図にする
    setOffset(DEFAULT_OFFSET);
  };

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent | MouseEvent).clientX, y: (e as React.MouseEvent | MouseEvent).clientY };
  };

  // マウスホイールでのズーム処理
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.05 : 0.95;
    const newScale = Math.min(Math.max(scale * factor, 0.1), 5);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      // ピンチ操作開始
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(dist);
      return;
    }

    const coords = getClientCoordinates(e);
    setDragStart(coords);
    setStartOffset({ ...offset });
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    // ピンチズーム処理
    if ('touches' in e && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDistance !== null) {
        const factor = dist / lastTouchDistance;
        const newScale = Math.min(Math.max(scale * factor, 0.1), 5);
        setScale(newScale);
      }
      setLastTouchDistance(dist);
      return;
    }

    if (!isDragging) return;

    const coords = getClientCoordinates(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;
    
    setOffset({
      x: startOffset.x + dx,
      y: startOffset.y + dy
    });
  }, [isDragging, dragStart, startOffset, scale, lastTouchDistance]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setLastTouchDistance(null);
  }, []);

  useEffect(() => {
    if (isDragging || lastTouchDistance !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, lastTouchDistance, handleMouseMove, handleMouseUp]);

  const resetAll = () => {
    setScale(DEFAULT_SCALE);
    setOffset(DEFAULT_OFFSET);
    setRotation(DEFAULT_ROTATION);
  };

  const executeCrop = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    
    const canvas = document.createElement('canvas');
    const outWidth = 1200;
    const outHeight = outWidth / ASPECT_RATIO;
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, outWidth, outHeight);

    ctx.translate(outWidth / 2, outHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const container = containerRef.current.querySelector('.aperture') as HTMLDivElement;
    const apertureWidth = container.clientWidth;
    const drawScale = outWidth / apertureWidth;

    const drawW = img.clientWidth * scale * drawScale;
    const drawH = img.clientHeight * scale * drawScale;
    
    const dx = offset.x * drawScale;
    const dy = offset.y * drawScale;

    ctx.drawImage(img, dx - drawW / 2, dy - drawH / 2, drawW, drawH);
    
    onConfirm(canvas.toDataURL('image/png'), {
      scale,
      offsetX: offset.x,
      offsetY: offset.y,
      rotation
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 animate-fade-in font-sans overflow-hidden">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center border border-gray-100 relative">
        
        {/* Step Indicator */}
        <div className="flex items-center gap-4 mb-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">1</div>
            <span className="text-[12px] mt-1 text-blue-600 font-bold">範囲調整</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-200"></div>
          <div className="flex flex-col items-center opacity-30">
            <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold">2</div>
            <span className="text-[12px] mt-1 text-gray-500 font-bold">画像加工</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold font-serif text-gray-800">遺影の構図を調整</h2>
          <p className="text-sm text-gray-500 mt-2">マウスホイールやピンチ操作でズームも可能です</p>
        </div>

        {/* Fixed Aperture Container */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden select-none bg-gray-900 rounded-xl shadow-inner touch-none flex items-center justify-center cursor-grab active:cursor-grabbing group" 
          style={{ width: '100%', height: '40vh' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onWheel={handleWheel}
          onDoubleClick={() => setScale(DEFAULT_SCALE)}
        >
          {/* Moving Image Layer */}
          <img 
            ref={imageRef} 
            src={imageSrc} 
            onLoad={onImageLoad} 
            alt="Crop Target" 
            className="pointer-events-none transition-transform duration-75"
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
              maxWidth: 'none',
              maxHeight: '100%'
            }} 
            draggable={false} 
          />

          {/* Fixed Window Overlay */}
          <div className="aperture absolute inset-0 flex items-center justify-center pointer-events-none">
             <div 
                className="relative border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] z-20" 
                style={{ 
                    aspectRatio: '3/4',
                    height: '90%',
                    maxWidth: '90%'
                }}
             >
                {/* Guide lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                  <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                  <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                  <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                </div>
             </div>
          </div>

          {/* Assistant Action Buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={(e) => { e.stopPropagation(); handleFit(); }}
                className="bg-black/40 hover:bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg text-xs font-bold border border-white/20 transition-all pointer-events-auto"
            >
                全体を表示
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); handleFill(); }}
                className="bg-black/40 hover:bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg text-xs font-bold border border-white/20 transition-all pointer-events-auto"
            >
                枠を埋める
            </button>
          </div>

          {/* Reset All Floating Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); resetAll(); }} 
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-2 rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[11px] font-bold pointer-events-auto border border-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            リセット
          </button>
        </div>

        {/* Controls Panel */}
        <div className="w-full max-w-lg mt-8 space-y-6 px-2">
          
          {/* Zoom Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[13px] font-bold text-gray-700">
              <span className="flex items-center gap-2 text-gray-500 font-sans">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196 7.5 7.5 0 0 0 10.607 16.03l5.196 5.197ZM10.5 7.5v6m3-3h-6" />
                </svg>
                拡大・縮小
              </span>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-mono">{Math.round(scale * 100)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setScale(Math.max(0.1, scale - 0.05))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all text-xl font-bold"
                >
                  －
                </button>
                <input type="range" min="0.1" max="3" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <button 
                  onClick={() => setScale(Math.min(5, scale + 0.05))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all text-xl font-bold"
                >
                  ＋
                </button>
            </div>
          </div>

          {/* Rotation Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[13px] font-bold text-gray-700">
              <span className="flex items-center gap-2 text-gray-500 font-sans">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                傾きの微調整
              </span>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-mono">{rotation.toFixed(1)}°</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setRotation(Math.max(-45, rotation - 0.5))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all text-sm"
                >
                  左回転
                </button>
                <input type="range" min="-15" max="15" step="0.1" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <button 
                  onClick={() => setRotation(Math.min(45, rotation + 0.5))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all text-sm"
                >
                  右回転
                </button>
            </div>
          </div>

          <button 
            onClick={() => setOffset(DEFAULT_OFFSET)}
            disabled={offset.x === DEFAULT_OFFSET.x && offset.y === DEFAULT_OFFSET.y}
            className={`w-full py-2.5 text-xs font-bold transition-all border rounded-lg flex items-center justify-center gap-2 font-sans ${
              (offset.x === DEFAULT_OFFSET.x && offset.y === DEFAULT_OFFSET.y)
              ? 'text-gray-300 border-gray-100 bg-white cursor-default'
              : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            位置を中央に戻す
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-lg">
           <button onClick={onCancel} className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm font-sans">戻る</button>
           <button onClick={executeCrop} className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg text-sm font-sans">決定して加工へ</button>
        </div>
      </div>
    </div>
  );
};

export default CropTool;
