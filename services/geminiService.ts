
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";
import { getBackgroundImage } from '../constants/backgroundImages';
import { getClothingImage } from '../constants/clothingImages';

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  return dataUrl.split(',')[1];
};

// ==========================================================
// EXPORTED FUNCTIONS
// ==========================================================


// 背景合成関数
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  try {
    if (option === BackgroundOption.None) return base64Image;
    
    const bgImageUrl = getBackgroundImage(option);
    if (!bgImageUrl) {
      throw new Error(`背景画像が見つかりません: ${option}`);
    }
    
    // 背景画像を合成
    return await compositeImages(base64Image, bgImageUrl, 'background');
  } catch (error: any) {
    console.error('背景合成エラー:', error);
    throw new Error(`背景の合成に失敗しました: ${error.message}`);
  }
};

// 着せ替え合成関数
export const applyClothingSynthesis = async (base64Image: string, option: ClothingOption): Promise<string> => {
  try {
    if (option === ClothingOption.None) return base64Image;
    
    const clothingImageUrl = getClothingImage(option);
    if (!clothingImageUrl) {
      throw new Error(`着せ替え画像が見つかりません: ${option}`);
    }
    
    // 着せ替え画像を合成
    return await compositeImages(base64Image, clothingImageUrl, 'clothing');
  } catch (error: any) {
    console.error('着せ替え合成エラー:', error);
    throw new Error(`着せ替えの合成に失敗しました: ${error.message}`);
  }
};

// 着せ替え合成関数
export const applyClothingSynthesis = async (base64Image: string, option: ClothingOption): Promise<string> => {
  if (option === ClothingOption.None) return base64Image;
  
  const clothingImageUrl = getClothingImage(option);
  if (!clothingImageUrl) return base64Image;
  
  // 着せ替え画像を合成
  return await compositeImages(base64Image, clothingImageUrl, 'clothing');
};

// 画像合成ヘルパー関数
const compositeImages = async (
  baseImage: string, 
  overlayUrl: string, 
  type: 'background' | 'clothing'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // ベース画像を読み込み
    const baseImg = new Image();
    baseImg.onload = () => {
      canvas.width = baseImg.width;
      canvas.height = baseImg.height;

      if (type === 'background') {
        // 背景を先に描画
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        bgImg.onerror = () => reject(new Error('Failed to load background image'));
        bgImg.src = overlayUrl;
      } else {
        // 着せ替えを上に描画
        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
        const clothingImg = new Image();
        clothingImg.crossOrigin = 'anonymous';
        clothingImg.onload = () => {
          ctx.drawImage(clothingImg, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        clothingImg.onerror = () => reject(new Error('Failed to load clothing image'));
        clothingImg.src = overlayUrl;
      }
    };
    baseImg.onerror = () => reject(new Error('Failed to load base image'));
    baseImg.src = baseImage;
  });
};

export const repairHeicImage = async (base64Heic: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { 
          parts: [
            { text: "[ROLE: RESTORATION EXPERT] Convert this HEIC image to a high-quality JPEG. ELIMINATE all noise/grain. Sharpen details." }, 
            { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }
          ] 
        },
        config: { 
          temperature: 0.0,
        }
    });
    // Safe access for repair function as well
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Repair failed");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
};
