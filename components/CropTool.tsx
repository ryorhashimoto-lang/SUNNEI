
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
    const factor = delta > 0 ? 1.05 : 0.95;
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
    <div className="flex flex-col h-full w-full bg-gray-50 font-sans animate-fade-in">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
             </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-800 font-serif">構図の調整</h2>
        </div>

        {/* Top Step Indicator (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Step 1: 範囲調整</span>
          <div className="w-8 h-px bg-gray-300"></div>
          <span className="text-xs font-bold text-gray-400">Step 2: 加工実行</span>
        </div>

        <button 
          onClick={executeCrop} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2"
        >
          決定して加工へ
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col pb-32">
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8">
          
          {/* Main Viewport Container */}
          <div className="relative bg-white p-2 rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div 
              ref={containerRef}
              className="relative overflow-hidden select-none bg-gray-900 rounded-xl touch-none flex items-center justify-center cursor-grab active:cursor-grabbing group min-h-[40vh] md:min-h-[50vh]" 
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              onWheel={handleWheel}
              onDoubleClick={() => setScale(DEFAULT_SCALE)}
            >
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

              <div className="aperture absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div 
                    className="relative border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] z-20" 
                    style={{ 
                        aspectRatio: '3/4',
                        height: '90%',
                        maxWidth: '90%'
                    }}
                 >
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                      <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                      <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                      <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                    </div>
                 </div>
              </div>

              {/* Quick Assistant Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); handleFit(); }} className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 pointer-events-auto shadow-lg">全体を表示</button>
                <button onClick={(e) => { e.stopPropagation(); handleFill(); }} className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 pointer-events-auto shadow-lg">枠を埋める</button>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); resetAll(); }} 
                className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all opacity-100 md:opacity-0 group-hover:opacity-100 flex items-center gap-2 text-xs font-bold pointer-events-auto border border-white/20"
              >
                リセット
              </button>
            </div>
          </div>

          {/* Controls Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            {/* Zoom Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196 7.5 7.5 0 0 0 10.607 16.03l5.196 5.197ZM10.5 7.5v6m3-3h-6" />
                  </svg>
                  拡大・縮小
                </label>
                <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-md text-xs font-mono font-bold">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setScale(Math.max(0.1, scale - 0.05))} className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all text-xl font-bold">－</button>
                <input type="range" min="0.1" max="3" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <button onClick={() => setScale(Math.min(5, scale + 0.05))} className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all text-xl font-bold">＋</button>
              </div>
            </div>

            {/* Rotation Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  傾きの調整
                </label>
                <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-md text-xs font-mono font-bold">{rotation.toFixed(1)}°</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setRotation(Math.max(-45, rotation - 0.5))} className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </button>
                <input type="range" min="-15" max="15" step="0.1" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <button onClick={() => setRotation(Math.min(45, rotation + 0.5))} className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 flex items-center justify-center z-50 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-4xl flex items-center gap-6">
          <button 
            onClick={onCancel} 
            className="flex-1 md:flex-none md:w-48 px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
          >
            キャンセル
          </button>
          <button 
            onClick={executeCrop} 
            className="flex-[2] md:flex-1 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all text-base flex items-center justify-center gap-3 animate-pulse-slow"
          >
            決定して画像加工へ進む
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default CropTool;
