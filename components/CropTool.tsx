
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
  
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const onImageLoad = () => {
    if (initialConfig) return;
    handleFit();
  };

  const handleFit = () => {
    setScale(0.7);
    setOffset(DEFAULT_OFFSET);
  };

  const handleFill = () => {
    setScale(1.1);
    setOffset(DEFAULT_OFFSET);
  };

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent | MouseEvent).clientX, y: (e as React.MouseEvent | MouseEvent).clientY };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(scale * factor, 0.1), 5);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
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

    const aperture = containerRef.current.querySelector('.aperture-window') as HTMLDivElement;
    const apertureWidth = aperture.clientWidth;
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
    <div className="flex flex-col h-screen w-full bg-[#1a1a1a] text-white font-sans overflow-hidden animate-fade-in">
      {/* 1. Header: 最小限の高さ */}
      <header className="h-14 shrink-0 bg-[#242424] border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-serif font-bold text-lg tracking-tight">構図調整</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Step 1: 範囲調整</span>
          </div>
          <button 
            onClick={executeCrop} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow-lg transition-all flex items-center gap-2"
          >
            決定
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. Main Area: PCは横並び、スマホは縦並び */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Viewport: 残りのスペースをすべて使う */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
          <div 
            ref={containerRef}
            className="w-full h-full relative flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onWheel={handleWheel}
            onDoubleClick={() => setScale(DEFAULT_SCALE)}
          >
            <img 
              ref={imageRef} 
              src={imageSrc} 
              onLoad={onImageLoad} 
              alt="Adjustment" 
              className="pointer-events-none transition-transform duration-75"
              style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                maxWidth: 'none',
                maxHeight: '100%'
              }} 
              draggable={false} 
            />

            {/* Overlay Grid */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
               <div 
                  className="aperture-window relative border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]" 
                  style={{ aspectRatio: '3/4', height: '85%', maxWidth: '90%' }}
               >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                    <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                    <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                  </div>
               </div>
            </div>

            {/* Fit/Fill Buttons: マウスオーバー時のみ表示 */}
            <div className="absolute bottom-6 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); handleFit(); }} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold border border-white/10 transition-all">全体を表示</button>
              <button onClick={(e) => { e.stopPropagation(); handleFill(); }} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold border border-white/10 transition-all">枠を埋める</button>
            </div>
          </div>
        </div>

        {/* 3. Control Panel: PC版はサイド、スマホ版はボトム */}
        <aside className="w-full md:w-80 shrink-0 bg-[#242424] border-t md:border-t-0 md:border-l border-white/5 p-5 flex flex-col justify-center gap-6 z-30">
          
          <div className="space-y-4">
            {/* Zoom Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">拡大・縮小</label>
                <span className="text-blue-400 font-mono text-[11px] font-bold">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setScale(Math.max(0.1, scale - 0.05))} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-lg transition-colors">－</button>
                <input type="range" min="0.1" max="2" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500" />
                <button onClick={() => setScale(Math.min(3, scale + 0.05))} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-lg transition-colors">＋</button>
              </div>
            </div>

            {/* Rotation Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">傾きの調整</label>
                <span className="text-blue-400 font-mono text-[11px] font-bold">{rotation.toFixed(1)}°</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setRotation(Math.max(-45, rotation - 0.5))} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-6-6m6 6V9a6 6 0 0112 0v3" />
                  </svg>
                </button>
                <input type="range" min="-15" max="15" step="0.1" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500" />
                <button onClick={() => setRotation(Math.min(45, rotation + 0.5))} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6 6m0 0l6-6m-6 6V9a6 6 0 00-12 0v3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button 
                onClick={() => { setScale(DEFAULT_SCALE); setRotation(DEFAULT_ROTATION); setOffset(DEFAULT_OFFSET); }}
                className="py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-bold transition-all border border-white/5"
            >
                リセット
            </button>
            <button 
                onClick={executeCrop}
                className="py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-[11px] font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
                完了して加工へ
            </button>
          </div>
        </aside>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};

export default CropTool;
