
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CropToolProps {
  imageSrc: string;
  onConfirm: (croppedImage: string) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ASPECT_RATIO = 3 / 4; // Gemini APIのサポート比率に合わせる（歪み防止）

const CropTool: React.FC<CropToolProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [crop, setCrop] = useState<Rect>({ x: 0.15, y: 0.1, width: 0.7, height: 0.93 });
  const [rotation, setRotation] = useState<number>(0);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  const onImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;

      let initialW = 0.6;
      let initialH = (containerW * initialW / ASPECT_RATIO) / containerH;

      if (initialH > 0.8) {
        initialH = 0.8;
        initialW = (containerH * initialH * ASPECT_RATIO) / containerW;
      }

      setCrop({
        x: (1 - initialW) / 2,
        y: (1 - initialH) / 2,
        width: initialW,
        height: initialH
      });
    }
  };

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent | MouseEvent).clientX, y: (e as React.MouseEvent | MouseEvent).clientY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, action: 'drag' | 'resize') => {
    const coords = getClientCoordinates(e);
    setDragStart(coords);
    setStartCrop({ ...crop });
    if (action === 'drag') setIsDragging(true);
    if (action === 'resize') setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging && !isResizing || !containerRef.current) return;

    const coords = getClientCoordinates(e);
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const dx = (coords.x - dragStart.x) / containerW;
    const dy = (coords.y - dragStart.y) / containerH;
    
    if (isDragging) {
      setCrop({
        ...startCrop,
        x: Math.max(0, Math.min(startCrop.x + dx, 1 - startCrop.width)),
        y: Math.max(0, Math.min(startCrop.y + dy, 1 - startCrop.height))
      });
    }

    if (isResizing) {
      let newWidth = Math.max(0.1, startCrop.width + dx);
      let newHeight = (newWidth * containerW / ASPECT_RATIO) / containerH;
      if (startCrop.x + newWidth > 1) {
        newWidth = 1 - startCrop.x;
        newHeight = (newWidth * containerW / ASPECT_RATIO) / containerH;
      }
      if (startCrop.y + newHeight > 1) {
        newHeight = 1 - startCrop.y;
        newWidth = (newHeight * containerH * ASPECT_RATIO) / containerW;
      }
      setCrop(c => ({ ...c, width: newWidth, height: newHeight }));
    }
  }, [isDragging, isResizing, dragStart, startCrop]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
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
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const executeCrop = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    const { naturalWidth, naturalHeight } = img;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const imgAspect = naturalWidth / naturalHeight;
    const containerAspect = containerW / containerH;

    let visualW, visualH, offsetX, offsetY;
    if (imgAspect > containerAspect) {
      visualW = containerW; visualH = containerW / imgAspect;
      offsetX = 0; offsetY = (containerH - visualH) / 2;
    } else {
      visualH = containerH; visualW = containerH * imgAspect;
      offsetY = 0; offsetX = (containerW - visualW) / 2;
    }

    const pixelCrop = {
      x: crop.x * containerW, y: crop.y * containerH,
      width: crop.width * containerW, height: crop.height * containerH
    };

    const scale = naturalWidth / visualW;
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width * scale;
    canvas.height = pixelCrop.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const dx = (offsetX + visualW / 2 - (pixelCrop.x + pixelCrop.width / 2)) * scale;
    const dy = (offsetY + visualH / 2 - (pixelCrop.y + pixelCrop.height / 2)) * scale;

    ctx.drawImage(img, dx - naturalWidth / 2, dy - naturalHeight / 2, naturalWidth, naturalHeight);
    onConfirm(canvas.toDataURL('image/png'));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 animate-fade-in font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center border border-gray-100 relative">
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
          <h2 className="text-3xl font-bold font-serif text-gray-800">遺影の範囲と傾きを調整</h2>
          <p className="text-sm text-gray-500 mt-2">アスペクト比 3:4 で固定されています</p>
        </div>

        <div ref={containerRef} className="relative overflow-hidden select-none bg-gray-900 rounded-xl shadow-2xl touch-none ring-4 ring-gray-100" style={{ width: '100%', height: '45vh', maxWidth: '100%' }}>
          <img ref={imageRef} src={imageSrc} onLoad={onImageLoad} alt="Crop" className="max-w-full max-h-full object-contain block opacity-50" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center center', width: '100%', height: '100%' }} draggable={false} />
          <div className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] cursor-move z-20" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }} onMouseDown={(e) => handleMouseDown(e, 'drag')} onTouchStart={(e) => handleMouseDown(e, 'drag')}>
             <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
              <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
            </div>
            <div className="absolute -bottom-5 -right-5 w-12 h-12 bg-blue-600 cursor-nwse-resize flex items-center justify-center rounded-full border-4 border-white shadow-xl" onMouseDown={(e) => handleMouseDown(e, 'resize')} onTouchStart={(e) => handleMouseDown(e, 'resize')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" /></svg>
            </div>
          </div>
        </div>

        <div className="w-full max-w-lg mt-8 space-y-5 px-2">
          <div className="flex items-center justify-between text-sm font-bold text-gray-700">
            <span className="flex items-center gap-2 text-gray-500">傾きの微調整</span>
            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">{rotation.toFixed(1)}°</span>
          </div>
          <input type="range" min="-15" max="15" step="0.1" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-lg">
           <button onClick={onCancel} className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm">戻る</button>
           <button onClick={executeCrop} className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg text-sm">決定して加工へ</button>
        </div>
      </div>
    </div>
  );
};

export default CropTool;
