
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropConfig } from '../types';

interface CropToolProps {
  imageSrc: string;
  initialConfig?: CropConfig | null;
  onConfirm: (croppedImage: string, config: CropConfig) => void;
  onCancel: () => void;
}

// 遺影写真用の比率を 5:6 に設定 (3000px : 3600px)
const ASPECT_RATIO = 5 / 6;

const CropTool: React.FC<CropToolProps> = ({ imageSrc, initialConfig, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const DEFAULT_SCALE = 0.8;
  const DEFAULT_OFFSET = { x: 0, y: 0 };
  const DEFAULT_ROTATION = 0;

  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [offset, setOffset] = useState(DEFAULT_OFFSET);
  const [rotation, setRotation] = useState(DEFAULT_ROTATION);
  
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startState, setStartState] = useState({ offset: { x: 0, y: 0 }, scale: 0 });
  
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  // Initialize/Restore config only after image is loaded and layout is ready
  const handleImageLoad = () => {
     if (initialConfig && containerRef.current && imageRef.current) {
         const aperture = containerRef.current.querySelector('.aperture-window') as HTMLDivElement;
         const img = imageRef.current;
         
         // Restore Scale: scale = normalizedScale / (imgWidth / apertureWidth)
         const ratio = img.clientWidth / aperture.clientWidth;
         // Avoid division by zero
         if (ratio > 0) {
           setScale(initialConfig.scale / ratio);
         }
         
         // Restore Offset: offset = normalizedOffset * apertureDimension
         setOffset({
             x: initialConfig.offsetX * aperture.clientWidth,
             y: initialConfig.offsetY * aperture.clientHeight
         });
         
         setRotation(initialConfig.rotation);
     } else {
        // Apply defaults explicitly if no config
        setScale(DEFAULT_SCALE);
        setOffset(DEFAULT_OFFSET);
        setRotation(DEFAULT_ROTATION);
     }
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
    // 出力解像度の基準幅。高さはアスペクト比(5:6)に合わせて計算
    const outWidth = 1200; 
    const outHeight = outWidth / ASPECT_RATIO; // 1200 / (5/6) = 1440
    
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
    const apertureHeight = aperture.clientHeight;
    
    // Scale calculation for rendering context
    const drawScale = outWidth / apertureWidth;

    const drawW = img.clientWidth * scale * drawScale;
    const drawH = img.clientHeight * scale * drawScale;
    const dx = offset.x * drawScale;
    const dy = offset.y * drawScale;

    ctx.drawImage(img, dx - drawW / 2, dy - drawH / 2, drawW, drawH);
    
    // Calculate normalized values for resolution-independent config
    // Normalized Scale: fraction of aperture width that the image occupies
    const normScale = (img.clientWidth / apertureWidth) * scale;
    // Normalized Offset: fraction of aperture dimensions
    const normX = offset.x / apertureWidth;
    const normY = offset.y / apertureHeight;

    onConfirm(canvas.toDataURL('image/png'), {
      scale: normScale,
      offsetX: normX,
      offsetY: normY,
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

        {/* 額装エリアの注意アラート */}
        <div className="hidden md:flex items-center gap-2 bg-red-900/30 border border-red-500/30 px-3 py-1.5 rounded text-[10px] text-red-200">
           <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
           赤枠部分（約5mm）は額装時に隠れる場合があります
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
              onLoad={handleImageLoad}
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
                  style={{ aspectRatio: '5/6', height: '80%', maxWidth: '90%' }}
               >
                  {/* ケラレ（額落ち）ガイドゾーン 
                      四つ切りサイズ(254x305mm)における5mm
                      横: 5/254 = 約1.97% 
                      縦: 5/305 = 約1.64% 
                  */}
                  <div className="absolute inset-0 border-[rgba(255,50,50,0.25)] pointer-events-none z-20"
                       style={{
                         borderLeftWidth: '2%',
                         borderRightWidth: '2%',
                         borderTopWidth: '1.6%',
                         borderBottomWidth: '1.6%'
                       }}>
                     {/* 角のガイドを赤色に強調 */}
                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-500/50"></div>
                     <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500/50"></div>
                     <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-500/50"></div>
                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-500/50"></div>
                  </div>

                  {/* Corner marks for aesthetic and guidance */}
                  <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-white shadow-sm"></div>
                  <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-white shadow-sm"></div>
                  <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-white shadow-sm"></div>
                  <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-white shadow-sm"></div>

                  {/* Rule of Thirds Guides */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                     <div className="border-r border-white/50 h-full"></div>
                     <div className="border-r border-white/50 h-full"></div>
                     <div className="col-start-1 col-end-4 border-b border-white/50 w-full h-0 absolute top-1/3"></div>
                     <div className="col-start-1 col-end-4 border-b border-white/50 w-full h-0 absolute top-2/3"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Mobile Alert */}
        <div className="md:hidden absolute top-20 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap">
           <div className="bg-red-900/50 backdrop-blur border border-red-500/30 px-3 py-1 rounded-full text-[9px] text-red-100 flex items-center gap-1.5 shadow-lg">
             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
             赤枠部分（約5mm）は額装で隠れます
           </div>
        </div>
      </div>
    </div>
  );
};

export default CropTool;
