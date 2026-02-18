
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
      // 右下ハンドル操作: ドラッグした距離に応じてズームスケールを変更
      // 右/下へ動かすほど枠が広がる（=画像は縮小されて見える）ため、感覚を合わせる
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
    <div className="flex flex-col h-screen w-full bg-[#111] text-white font-sans overflow-hidden animate-fade-in select-none">
      <header className="h-16 shrink-0 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h1 className="font-serif font-bold text-lg tracking-wider text-gray-100 leading-none">構図の調整</h1>
            <p className="text-[9px] text-gray-500 font-bold tracking-[0.2em] mt-1.5 uppercase font-sans">Composition Tool</p>
          </div>
        </div>
        <button 
          onClick={executeCrop} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-full font-bold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
        >
          この構図で決定
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
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
              className="pointer-events-none transition-transform duration-75 will-change-transform"
              style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                maxWidth: 'none',
                maxHeight: '100%'
              }} 
            />

            {/* Viewport Frame with Corner Handle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
               <div 
                  className="aperture-window relative border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.8)]" 
                  style={{ aspectRatio: '3/4', height: '80%', maxWidth: '90%' }}
               >
                  {/* Corner marks for aesthetic and guidance */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white shadow-sm"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white shadow-sm"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white shadow-sm"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white shadow-sm"></div>

                  {/* Rule of Thirds Guides */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                    <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                    <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                  </div>

                  {/* The Resize Handle - Bottom Right Corner */}
                  <div 
                    className="absolute -right-4 -bottom-4 w-11 h-11 bg-blue-600 rounded-full border-[4px] border-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] pointer-events-auto cursor-nwse-resize active:scale-125 transition-transform flex items-center justify-center group/handle"
                    onMouseDown={(e) => startDrag(e, 'resize')}
                    onTouchStart={(e) => startDrag(e, 'resize')}
                  >
                    <div className="w-5 h-5 text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <polyline points="9 21 3 21 3 15"></polyline>
                        <line x1="21" y1="3" x2="14" y2="10"></line>
                        <line x1="3" y1="21" x2="10" y2="14"></line>
                      </svg>
                    </div>
                    {/* Visual Ripple effect when hovering handle */}
                    <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping opacity-0 group-hover/handle:opacity-100 transition-opacity"></div>
                  </div>
               </div>
            </div>

            <div className="absolute bottom-10 flex gap-4 z-20">
              <button onClick={(e) => { e.stopPropagation(); handleFit(); }} className="bg-white/10 hover:bg-white/20 backdrop-blur-xl px-7 py-3 rounded-full text-[11px] font-bold border border-white/10 transition-all pointer-events-auto active:scale-95 shadow-lg">全体を表示</button>
              <button onClick={(e) => { e.stopPropagation(); handleFill(); }} className="bg-white/10 hover:bg-white/20 backdrop-blur-xl px-7 py-3 rounded-full text-[11px] font-bold border border-white/10 transition-all pointer-events-auto active:scale-95 shadow-lg">枠を埋める</button>
            </div>
          </div>
        </div>

        <aside className="w-full md:w-80 shrink-0 bg-[#1a1a1a] border-t md:border-t-0 md:border-l border-white/5 p-8 flex flex-col justify-center gap-12 z-30 shadow-2xl">
          <div className="space-y-10">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">拡大・縮小 (ズーム)</label>
                <span className="text-blue-500 font-mono text-xs font-bold">{Math.round(scale * 100)}%</span>
              </div>
              <input type="range" min="0.1" max="3" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-600" />
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">水平方向の傾き</label>
                <span className="text-blue-500 font-mono text-xs font-bold">{rotation.toFixed(1)}°</span>
              </div>
              <input type="range" min="-30" max="30" step="0.5" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-600" />
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
               <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                <span className="text-blue-400 font-bold block mb-2 uppercase tracking-widest">操作のヒント</span>
                • 枠の外をドラッグして位置を移動<br/>
                • 枠の右下ハンドルで範囲を拡大縮小<br/>
                • マウスホイールでズーム調整
              </p>
             </div>
            <button 
                onClick={() => { setScale(DEFAULT_SCALE); setRotation(DEFAULT_ROTATION); setOffset(DEFAULT_OFFSET); }}
                className="w-full py-4 bg-transparent hover:bg-white/5 rounded-xl text-[10px] font-bold tracking-widest transition-all border border-white/10 uppercase"
            >
                調整をリセット
            </button>
          </div>
        </aside>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 22px; height: 22px;
          background: #2563eb; border-radius: 50%; border: 3px solid white;
          cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};

export default CropTool;
