
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
  
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startState, setStartState] = useState({ offset: { x: 0, y: 0 }, scale: 0 });
  
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

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
    setScale(prev => Math.min(Math.max(prev * factor, 0.1), 5));
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent, mode: 'move' | 'resize') => {
    e.stopPropagation();
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
    setStartState({ offset: { ...offset }, scale: scale });
    setDragMode(mode);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDistance !== null) {
        const factor = dist / lastTouchDistance;
        setScale(prev => Math.min(Math.max(prev * factor, 0.1), 5));
      }
      setLastTouchDistance(dist);
      return;
    }

    if (!dragMode) return;

    const coords = getClientCoordinates(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    if (dragMode === 'move') {
      setOffset({
        x: startState.offset.x + dx,
        y: startState.offset.y + dy
      });
    } else if (dragMode === 'resize') {
      // 右下ハンドル操作: ドラッグした距離に応じてスケールを変更
      // 対角線方向の移動量を基準にする
      const moveMagnitude = (dx + dy) / 2;
      const scaleSensitivity = 0.005;
      setScale(Math.min(Math.max(startState.scale - (moveMagnitude * scaleSensitivity), 0.1), 5));
    }
  }, [dragMode, dragStart, startState, lastTouchDistance]);

  const endDrag = useCallback(() => {
    setDragMode(null);
    setLastTouchDistance(null);
  }, []);

  useEffect(() => {
    if (dragMode || lastTouchDistance !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', endDrag);
      window.addEventListener('touchend', endDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchend', endDrag);
    };
  }, [dragMode, lastTouchDistance, handleMouseMove, endDrag]);

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
      <header className="h-14 shrink-0 bg-[#242424] border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-serif font-bold text-lg tracking-tight">構図調整</span>
        </div>
        <button 
          onClick={executeCrop} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full font-bold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
        >
          決定
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
          <div 
            ref={containerRef}
            className="w-full h-full relative flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => startDrag(e, 'move')}
            onTouchStart={(e) => startDrag(e, 'move')}
            onWheel={handleWheel}
          >
            <img 
              ref={imageRef} 
              src={imageSrc} 
              alt="Adjustment" 
              className="pointer-events-none transition-transform duration-75"
              style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                maxWidth: 'none',
                maxHeight: '100%'
              }} 
            />

            {/* Viewport Frame with Handle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
               <div 
                  className="aperture-window relative border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]" 
                  style={{ aspectRatio: '3/4', height: '80%', maxWidth: '90%' }}
               >
                  {/* Handle to Pull */}
                  <div 
                    className="absolute -right-3 -bottom-3 w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-xl pointer-events-auto cursor-nwse-resize active:scale-125 transition-transform flex items-center justify-center"
                    onMouseDown={(e) => startDrag(e, 'resize')}
                    onTouchStart={(e) => startDrag(e, 'resize')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </div>

                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
                    <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                    <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                  </div>
               </div>
            </div>

            <div className="absolute bottom-6 flex gap-2 z-20">
              <button onClick={(e) => { e.stopPropagation(); handleFit(); }} className="bg-black/40 hover:bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full text-[11px] font-bold border border-white/10 transition-all pointer-events-auto">全体表示</button>
              <button onClick={(e) => { e.stopPropagation(); handleFill(); }} className="bg-black/40 hover:bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full text-[11px] font-bold border border-white/10 transition-all pointer-events-auto">枠を埋める</button>
            </div>
          </div>
        </div>

        <aside className="w-full md:w-80 shrink-0 bg-[#242424] border-t md:border-t-0 md:border-l border-white/5 p-6 flex flex-col justify-center gap-8 z-30">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">拡大・縮小</label>
              <input type="range" min="0.1" max="3" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">傾きの調整</label>
                <span className="text-blue-400 font-mono text-[11px] font-bold">{rotation.toFixed(1)}°</span>
              </div>
              <input type="range" min="-30" max="30" step="0.5" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500" />
            </div>
          </div>

          <div className="space-y-4">
             <p className="text-[10px] text-gray-500 leading-relaxed italic text-center">
              ※ 枠の右下を引っ張って直感的に調整できます。<br/>マウスホイールやピンチ操作でも拡大縮小が可能です。
            </p>
            <button 
                onClick={() => { setScale(DEFAULT_SCALE); setRotation(DEFAULT_ROTATION); setOffset(DEFAULT_OFFSET); }}
                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5"
            >
                調整をリセット
            </button>
          </div>
        </aside>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px;
          background: #3b82f6; border-radius: 50%; border: 3px solid white;
          cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default CropTool;
