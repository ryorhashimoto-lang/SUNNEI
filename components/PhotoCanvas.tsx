
import React, { useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { drawMemorialPhoto } from '../services/renderService';

interface PhotoCanvasProps {
  originalCropped: string | null;
  personImage: string | null;
  isLoading: boolean;
  loadingMessage: string;
}

const PhotoCanvas: React.FC<PhotoCanvasProps> = ({ 
  originalCropped, 
  personImage,
  isLoading, 
  loadingMessage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const render = async () => {
      if (!canvasRef.current || !originalCropped) return;
      
      const width = 800;
      const height = 1066;
      
      await drawMemorialPhoto({
        canvas: canvasRef.current,
        originalCropped,
        personImage,
        width,
        height,
        isHighRes: false
      });
    };

    render();
  }, [originalCropped, personImage]);

  if (!originalCropped) return null;

  return (
    <div className="relative w-full max-w-md">
      <div className="aspect-[3/4] overflow-hidden relative rounded-lg border-4 border-white shadow-xl bg-gray-200">
        {isLoading && <LoadingSpinner message={loadingMessage} />}
        <canvas ref={canvasRef} className="w-full h-full object-contain block" />
      </div>
      <p className="mt-4 text-center text-xs text-gray-400 tracking-widest font-bold">
        ※ 縦横比 3:4 で最適化されています
      </p>
    </div>
  );
};

export default PhotoCanvas;
