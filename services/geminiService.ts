
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";
import { getBackgroundImage } from '../constants/backgroundImages';
import { getClothingImage } from '../constants/clothingImages';

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  return dataUrl.split(',')[1];
};

/**
 * Prompt generation logic: Defines the visual style of the requested output.
 */
const getPrompts = (clothing: ClothingOption, background: BackgroundOption) => {
  let clothingPrompt = "";
  
  // Enhanced descriptions for Material Physics & Cultural Accuracy
  switch (clothing) {
    case ClothingOption.None:
      clothingPrompt = "";
      break;
    
    // Men
    case ClothingOption.MensSuitBlack:
      clothingPrompt = "a premium formal black mourning suit (Super Black matte wool, approx 300gsm weight). White shirt. Tie: Solid matte black silk mourning tie, plain knot (or Windsor), NO fashion dimples, strict solemn style. The lapel has a soft 'roll' indicating high-quality tailoring.";
      break;
    case ClothingOption.MensKimonoBlack:
      clothingPrompt = "服装は日本の伝統的な喪服で、漆黒の無地の羽織と着物を着用している。羽織の左右の胸元にのみ、白色ではっきりと染め抜かれた家紋（紋）がそれぞれ1つずつ、合計2つある（抱き紋）。生地自体にはこの家紋以外の地紋、柄、模様、刺繍、デザインは一切なく、完全に均一な黒色である。 首元から、白い半衿（長襦袢の襟）が清潔に少し見えている。";
      break;

    // Women
    case ClothingOption.WomensSuitBlack:
      clothingPrompt = "a women's high-quality formal black mourning ensemble (matte black jacket and dress, non-shiny deep black fabric). Accessories: A single strand of white pearls (matte luster). Modest, feminine tailored fit, high neckline.";
      break;
    case ClothingOption.WomensKimonoBlack:
      clothingPrompt = "The character is wearing traditional Japanese formal mourning attire (Mofuku). It consists of a solid, jet-black kimono and a matching jet-black haori coat. There are exactly two family crests (Kamon) clearly dyed in crisp white on the front: one on each side of the haori's chest (Dakimon). Aside from these two crests, the fabric is completely void of any woven patterns, textures, embroidery, or designs—a perfectly uniform, deep matte black. A clean, white under-collar (han-eri) is neatly visible at the neckline.";
      break;
  }

  let backgroundPrompt = "";
  const qualitySuffix = "clean, professional studio gradient background with distinct edge separation from the subject, sharp high-end photographic finish";
  
  switch (background) {
    case BackgroundOption.None:
      backgroundPrompt = "Keep the background exactly as it is.";
      break;
    case BackgroundOption.SoftBlue:
      backgroundPrompt = `a very light, pale blue ${qualitySuffix}`;
      break;
    case BackgroundOption.SoftPink:
      backgroundPrompt = `a very light, pale pink ${qualitySuffix}`;
      break;
    case BackgroundOption.WisteriaPurple:
      backgroundPrompt = `a very light, pale purple ${qualitySuffix}`;
      break;
    case BackgroundOption.FreshGreen:
      backgroundPrompt = `a very light, pale green ${qualitySuffix}`;
      break;
    case BackgroundOption.WhiteGrey:
      backgroundPrompt = `a bright, clean white-grey ${qualitySuffix}`;
      break;
    case BackgroundOption.Sky:
      backgroundPrompt = `A vast, pristine blue sky filled with soft, fluffy white cumulus clouds. Peaceful, serene, and gentle atmosphere, evoking a sense of heavenly rest and eternal peace. Soft, diffuse natural daylight, professional landscape photography, highly detailed. ${qualitySuffix}`;
      break;
    case BackgroundOption.Sea:
      backgroundPrompt = `photorealistic, hyper-realistic, extremely detailed depiction of a vast, calm, and serene ocean with pristine water and gentle, diffuse daylight resembling a professional studio backdrop for portraiture. The horizon is vast and clear. The atmosphere is peaceful, comforting, and sacred, evoking a sense of heavenly rest and eternal peace. Minimalist composition focused on the water and sky, uninterrupted ${qualitySuffix}`;
      break;
    case BackgroundOption.CherryBlossom:
      backgroundPrompt = `A photorealistic, high-quality portrait backdrop of pale pink cherry blossoms in soft focus. Beautiful bokeh, soft spring lighting, peaceful and sacred atmosphere ${qualitySuffix}`;
      break;
    case BackgroundOption.FreshNewGreen:
      backgroundPrompt = `A photorealistic, high-quality portrait backdrop of fresh green leaves in soft focus. Beautiful bokeh with gentle sunbeams, peaceful and sacred atmosphere ${qualitySuffix}`;
           break;
  }

  return { clothingPrompt, backgroundPrompt };
};

// Retry helper function
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransient = 
      error.status === 500 || 
      error.status === 503 ||
      (error.error && (error.error.code === 500 || error.error.code === 503)) ||
      (error.message && (
        error.message.includes("500") || 
        error.message.includes("Rpc failed") || 
        error.message.includes("overloaded") || 
        error.message.includes("unavailable")
      ));

    if (retries > 0 && isTransient) {
      console.warn(`Transient error detected. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// ==========================================================
// EXPORTED FUNCTIONS
// ==========================================================

// 背景合成関数
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  if (option === BackgroundOption.None) return base64Image;
  
  const bgImageUrl = getBackgroundImage(option);
  if (!bgImageUrl) return base64Image;
  
  // 背景画像を合成
  return await compositeImages(base64Image, bgImageUrl, 'background');
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
