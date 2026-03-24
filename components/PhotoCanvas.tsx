
import React, { useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { drawMemorialPhoto } from '../services/renderService';
import { CropConfig, BackgroundOption } from '../types';

interface PhotoCanvasProps {
  originalCropped: string | null;
  personImage: string | null;
  isLoading: boolean;
  loadingMessage: string;
  finalCropConfig?: CropConfig | null;
  backgroundOption?: BackgroundOption;
}

const PhotoCanvas: React.FC<PhotoCanvasProps> = ({ 
  originalCropped, 
  personImage,
  isLoading, 
  loadingMessage,
  finalCropConfig,
  backgroundOption
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const render = async () => {
      if (!canvasRef.current || !originalCropped) return;
      
      // アスペクト比 3:4 (プレビュー用調整)
      const width = 1200;
      const height = 1600;
      
      await drawMemorialPhoto({
        canvas: canvasRef.current,
        originalCropped,
        personImage,
        width,
        height,
        isHighRes: false,
        finalCropConfig,
        backgroundOption
      });
    };

    render();
  }, [originalCropped, personImage, finalCropConfig, backgroundOption]);

  if (!originalCropped) return null;

  return (
    <div className="relative w-full max-w-lg mx-auto p-4 md:p-8">
      <div className="relative group">
        {/* Decorative frame shadow */}
        <div className="absolute -inset-1 bg-gradient-to-tr from-gray-300 to-gray-100 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        
        {/* アスペクト比 3:4 を強制 */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border-[12px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-gray-50">
          {isLoading && <LoadingSpinner message={loadingMessage} />}
          <canvas 
            ref={canvasRef} 
            className="w-full h-full object-contain block transition-opacity duration-700"
            style={{ opacity: isLoading ? 0.3 : 1 }}
          />
          
          {/* Subtle overlay to give photographic texture */}
          <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.03] mix-blend-overlay"></div>
        </div>
      </div>

      <div className="mt-8 text-center space-y-1">
        <p className="text-[11px] text-gray-400 font-sans tracking-[0.3em] font-bold uppercase">
          Studio Preview
        </p>
        <p className="text-[10px] text-gray-300 font-sans">
          ※ 実際の保存データは3:4サイズ（3000x4000px）で生成されます
        </p>
      </div>
    </div>
  );
};

export default PhotoCanvas;
