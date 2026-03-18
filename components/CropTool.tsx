
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropConfig, BackgroundOption } from '../types';
import { getBackgroundImage } from '../constants/backgroundImages';

interface CropToolProps {
  imageSrc: string;
  initialConfig?: CropConfig | null;
  onConfirm: (croppedImage: string, config: CropConfig) => void;
  onCancel: () => void;
  // ✨ 新しいプロパティを追加
  backgroundColor?: string;  // 背景色
  backgroundImage?: string;  // 背景画像URL
}

// 遺影写真用の比率を 5:6 に設定 (3000px : 3600px)
const ASPECT_RATIO = 5 / 6;

const CropTool: React.FC<CropToolProps> = ({ imageSrc, initialConfig, onConfirm, onCancel, backgroundColor, backgroundImage }) => {
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

    // 背景スタイルを動的に生成する関数
  const getBackgroundStyle = () => {
    if (backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {
      backgroundColor: backgroundColor || '#000',
    };
  };
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
        if (!initialConfig) {
             setScale(DEFAULT_SCALE);
             setOffset(DEFAULT_OFFSET);
             setRotation(DEFAULT_ROTATION);
        }
     }
  };

  const handleReset = () => {
    setScale(DEFAULT_SCALE);
    setOffset(DEFAULT_OFFSET);
    setRotation(DEFAULT_ROTATION);
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
    setScale(prev => Math.min(Math.max(prev * factor, 0.1), 3.0));
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
        setScale(prev => Math.min(Math.max(prev * factor, 0.1), 3.0));
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
      setScale(Math.min(Math.max(startState.scale - (moveMagnitude * scaleSensitivity), 0.1), 3.0));
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

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div 
          className="flex-1 relative flex items-center justify-center overflow-hidden group"
          style={getBackgroundStyle()}
        >
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

            {/* Viewport Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
               <div 
                  className="aperture-window relative border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.8)]" 
                  style={{ aspectRatio: '5/6', height: '80%', maxWidth: '90%' }}
               >
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

        {/* Control Footer */}
        <div className="bg-[#1a1a1a] border-t border-white/10 px-6 py-6 pb-10 md:pb-8 shrink-0 z-50">
           <div className="max-w-xl mx-auto flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                 {/* Scale Slider */}
                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                       <span>サイズ (拡大/縮小)</span>
                       <span className="text-white">{Math.round(scale * 100)}%</span>
                    </div>
                    <input 
                       type="range" min="0.1" max="3.0" step="0.01"
                       value={scale}
                       onChange={(e) => setScale(parseFloat(e.target.value))}
                       className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.1)] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                    />
                 </div>

                 {/* Rotation Slider */}
                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                       <span>角度 (回転)</span>
                       <span className="text-white">{Math.round(rotation)}°</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] text-gray-600 font-bold">-45°</span>
                       <input 
                          type="range" min="-45" max="45" step="0.5"
                          value={rotation}
                          onChange={(e) => setRotation(parseFloat(e.target.value))}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.1)] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                       />
                       <span className="text-[9px] text-gray-600 font-bold">+45°</span>
                    </div>
                 </div>
              </div>

              {/* Reset Button */}
              <div className="flex justify-center pt-2">
                 <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5 active:scale-95 border border-transparent hover:border-white/10"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                       <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z" clipRule="evenodd" />
                    </svg>
                    調整をリセット
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CropTool;
