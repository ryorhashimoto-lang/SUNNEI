
// Add missing React import
import React, { useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { EditAction, CropConfig } from '../types';
import { drawMemorialPhoto } from '../services/renderService';

interface PhotoCanvasProps {
  originalCropped: string | null;
  personImage: string | null;
  appliedBg: EditAction | null;
  isLoading: boolean;
  loadingMessage: string;
  finalCropConfig?: CropConfig | null;
}

const PhotoCanvas: React.FC<PhotoCanvasProps> = ({ 
  originalCropped, 
  personImage,
  appliedBg,
  isLoading, 
  loadingMessage,
  finalCropConfig = null
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
        appliedBg,
        width,
        height,
        isHighRes: false,
        finalCropConfig
      });
    };

    render();
  }, [originalCropped, personImage, appliedBg, finalCropConfig]);

  if (!originalCropped) return null;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div 
        className="aspect-[3/4] overflow-hidden relative select-none rounded-lg border-4 border-white shadow-xl bg-gray-200"
      >
        {isLoading && <LoadingSpinner message={loadingMessage} />}
        
        <canvas 
          ref={canvasRef}
          className="w-full h-full object-contain block"
        />
      </div>
      
      {!isLoading && (
        <div className="mt-4 text-center">
          <p className="text-[12px] text-gray-400 font-sans tracking-wider font-bold">
            ※アスペクト比 3:4 で保存されます
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoCanvas;
