import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  return dataUrl.split(',')[1];
};

// 背景画像のパスを取得
const getBackgroundImage = (option: BackgroundOption): string | null => {
  const backgroundMap: Record<BackgroundOption, string> = {
    [BackgroundOption.None]: '',
    [BackgroundOption.Sky]: '/backgrounds/sky.png',
    [BackgroundOption.Sea]: '/backgrounds/sea.png',
    [BackgroundOption.CherryBlossom]: '/backgrounds/cherry_blossom.png',
    [BackgroundOption.FreshNewGreen]: '/backgrounds/fresh_new_green.png',
    [BackgroundOption.SoftBlue]: '/backgrounds/soft_blue.png',
    [BackgroundOption.SoftPink]: '/backgrounds/soft_pink.png',
    [BackgroundOption.WisteriaPurple]: '/backgrounds/wisteria_purple.png',
    [BackgroundOption.FreshGreen]: '/backgrounds/fresh_green.png',
    [BackgroundOption.WhiteGrey]: '/backgrounds/white_grey.png',
  };

  return backgroundMap[option] || null;
};

// 服装画像のパスを取得
const getClothingImage = (option: ClothingOption): string | null => {
  const clothingMap: Record<ClothingOption, string> = {
    [ClothingOption.None]: '',
    [ClothingOption.MensSuitBlack]: '/clothing/mens_suit_black.jpg',
    [ClothingOption.MensKimonoBlack]: '/clothing/mens_kimono_black.jpg',
    [ClothingOption.WomensSuitBlack]: '/clothing/womens_suit_black.jpg',
    [ClothingOption.WomensKimonoBlack]: '/clothing/womens_kimono_black.jpg',
  };

  return clothingMap[option] || null;
};

// Blob を base64 に変換
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

/**
 * 背景合成：ユーザー画像 + public 背景画像を Gemini で合成
 */
export const applyBackgroundSynthesis = async (
  base64Image: string,
  option: BackgroundOption,
): Promise<string> => {
  try {
    if (option === BackgroundOption.None) return base64Image;

    console.log('🤖 背景合成を開始:', option);

    // public 背景画像を取得
    const bgImageUrl = getBackgroundImage(option);
    if (!bgImageUrl) {
      throw new Error(`背景画像が見つかりません: ${option}`);
    }

    console.log('📸 背景画像を読み込み中:', bgImageUrl);

    // 背景画像を fetch して base64 に変換
    const bgResponse = await fetch(bgImageUrl);
    if (!bgResponse.ok) {
      throw new Error(`背景画像の読み込みに失敗: ${bgResponse.statusText}`);
    }
    const bgBlob = await bgResponse.blob();
    const bgBase64 = await blobToBase64(bgBlob);

    console.log('✅ 背景画像を base64 に変換完了');
    console.log('🔄 Gemini で合成中...');

    // Gemini SDK で直接合成
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      You are a professional image compositor.
      Combine the user's portrait with the provided background image.
      
      Requirements:
      - Keep the person's body, face, and clothing SHARP and DETAILED
      - Seamlessly blend the person with the background
      - Maintain natural lighting and shadows
      - Do NOT blur or smooth the subject
      - Preserve the person's facial features and identity
    `;

    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64(base64Image),
              },
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: bgBase64,
              },
            },
          ],
        },
        config: {
          temperature: 0.0,
          imageConfig: {
            aspectRatio: "3:4",
          },
        },
      });
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ 背景合成完了（Gemini）');
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("画像が生成されませんでした。別の写真をお試しください。");

  } catch (error: any) {
    console.error("背景合成エラー:", error);
    throw new Error(`背景の合成に失敗しました: ${error.message}`);
  }
};

/**
 * 服装合成：ユーザー画像 + public 服装画像を Gemini で合成
 */
export const applyClothingSynthesis = async (
  base64Image: string,
  option: ClothingOption,
): Promise<string> => {
  try {
    if (option === ClothingOption.None) return base64Image;

    console.log('🤖 服装合成を開始:', option);

    // public 服装画像を取得
    const clothingImageUrl = getClothingImage(option);
    if (!clothingImageUrl) {
      throw new Error(`服装画像が見つかりません: ${option}`);
    }

    console.log('📸 服装画像を読み込み中:', clothingImageUrl);

    // 服装画像を fetch して base64 に変換
    const clothingResponse = await fetch(clothingImageUrl);
    if (!clothingResponse.ok) {
      throw new Error(`服装画像の読み込みに失敗: ${clothingResponse.statusText}`);
    }
    const clothingBlob = await clothingResponse.blob();
    const clothingBase64 = await blobToBase64(clothingBlob);

    console.log('✅ 服装画像を base64 に変換完了');
    console.log('🔄 Gemini で合成中...');

    // Gemini SDK で直接合成
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      You are a professional image compositor specializing in clothing synthesis.
      Replace the user's clothing with the clothing from the provided image.
      
      Requirements:
      - Keep the person's face, head, and body shape intact
      - Seamlessly blend the new clothing with the person's body
      - Maintain natural lighting and shadows
      - Preserve facial features and identity
      - Do NOT blur or alter the subject's face
      - Make the clothing look natural on the person's body
    `;

    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64(base64Image),
              },
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: clothingBase64,
              },
            },
          ],
        },
        config: {
          temperature: 0.0,
          imageConfig: {
            aspectRatio: "3:4",
          },
        },
      });
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ 服装合成完了（Gemini）');
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("画像が生成されませんでした。別の写真をお試しください。");

  } catch (error: any) {
    console.error("服装合成エラー:", error);
    throw new Error(`服装の合成に失敗しました: ${error.message}`);
  }
};

/**
 * HEIC 修復：HEIC を JPEG に変換
 */
export const repairHeicImage = async (base64Heic: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

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

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Repair failed");
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
};
