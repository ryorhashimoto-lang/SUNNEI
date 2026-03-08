
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

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
      backgroundPrompt = `photorealistic, hyper-realistic. Soft, pale pink cherry blossoms (sakura) with beautiful, creamy bokeh, resembling a premium professional studio backdrop for portraiture. Gentle, diffuse spring daylight. The center is clear and softly blurred to perfectly frame a person's face. The atmosphere is peaceful, comforting, elegant, and sacred, evoking a sense of heavenly rest and eternal peace. Uninterrupted, dignified pastel tones ${qualitySuffix}`;
      break;
    case BackgroundOption.FreshNewGreen:
      backgroundPrompt = `photorealistic, hyper-realistic. Soft, fresh green leaves (shinryoku) with beautiful, creamy bokeh and gentle sunbeams (komorebi) filtering through the foliage. Resembling a premium professional studio backdrop for portraiture. Soft, diffuse, warm natural daylight. The center is clear and softly blurred to perfectly frame a person's face. The atmosphere is peaceful, comforting, elegant, and sacred, evoking a sense of heavenly rest and eternal peace. Uninterrupted, dignified soft green tones ${qualitySuffix}`;
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

/**
 * Core generation logic: Hybrid "Chain of Thought" strategy
 * Combines "Restoration/Inpainting" strength with "Physics/Camera" realism.
 */
const generatePortrait = async (
  imageBase64: string,
  clothing: ClothingOption,
  background: BackgroundOption
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { clothingPrompt, backgroundPrompt } = getPrompts(clothing, background);

  // === Chain of Thought Instruction Construction ===
  const instructionList: string[] = [];

  // [Phase 1: Digital Restoration (The "Eraser" & "Builder")]
  // 強力な除去・復元指示
  instructionList.push("STEP 1 [DIGITAL RESTORATION]:");
  instructionList.push("  - IDENTIFY and REMOVE all obstructions in front of the subject (e.g., other people's hands, bouquets, babies, microphones, text overlays).");
  instructionList.push("  - INPAINTING: Do not leave empty space. Anatomically reconstruct the 'chest', 'shoulders', and 'body' that were hidden behind the objects.");
  instructionList.push("  - TEXTURE: Keep the original skin texture exactly as captured, including natural grain and photographic characteristics. Do NOT remove or alter the natural texture patterns. Preserve authenticity over artificial enhancement.");

  // [Phase 2: Clothing Simulation (The "Tailor")]
  // 安定版の強み：生地の重さと質感
  if (clothing !== ClothingOption.None) {
    instructionList.push(`STEP 2 [CLOTHING GENERATION]: Change clothing to: ${clothingPrompt}`);
    instructionList.push("  - FABRIC PHYSICS: Calculate as 300g/m² Heavy Wool/Silk. The fabric must drape with weight. Shoulders should be structured, not round like a T-shirt.");
    instructionList.push("  - COLLAR FIT: The collar must sit with weight on the clavicles.");
  } else {
    instructionList.push("STEP 2 [CLOTHING]: Keep the original clothing.");
  }

  // [Phase 3: Cultural Rules (The "Master")]
  // 安定版の強み：着付けの絶対ルール
  if (clothing === ClothingOption.MensKimonoBlack || clothing === ClothingOption.WomensKimonoBlack) {
    instructionList.push("STEP 3 [CULTURAL RULES - CRITICAL]:");
    instructionList.push("  - KIMONO COLLAR: Must be 'Left Over Right' (creates a lowercase 'y' shape on chest).");
    instructionList.push("  - TABOO: Never generate 'Right Over Left' (this is for the deceased).");
  }

  // [Phase 4: Background (The "Stage")]
  if (background !== BackgroundOption.None) {
    instructionList.push(`STEP 4 [BACKGROUND]: Change background to: ${backgroundPrompt}`);
    instructionList.push("  - SUBJECT PROTECTION: Keep the person's body, clothing, and skin details SHARP and DETAILED.");
    instructionList.push("  - Do NOT apply smoothing, blurring, or uniform texture to the subject's body.");
  } else {
    instructionList.push("STEP 4 [BACKGROUND]: Keep original background.");
  }

  // [Phase 5: Identity Protection (The "Guardian")]
  // 共通の重要事項：顔の保護
  instructionList.push("FINAL STEP [IDENTITY PROTECTION]:");
  instructionList.push("  - FACE LOCK: Do NOT move the coordinates of eyes, nose, mouth, and eyebrows.");
  instructionList.push("  - IDENTITY MARKERS: Preserve moles, scars, and age spots. These are the person's history. Do not over-smooth the skin.");

  const prompt = `
    Role: You are a master professional retoucher (Compositor) specializing in Japanese memorial portraits (Iei).
    Task: Create a respectful, high-quality portrait by following this strict execution plan.

    EXECUTION PLAN:
    ${instructionList.join('\n')}
  `;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64(imageBase64),
              },
            },
          ],
        },
        config: {
          temperature: 0.0,
          imageConfig: {
             aspectRatio: "3:4" 
          }
        }
      });
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      // Fix: Add optional chaining and null check to prevent "Object is possibly undefined" error
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("画像が生成されませんでした。別の写真をお試しください。");

  } catch (error: any) {
    console.error("Gemini API Error:", JSON.stringify(error, null, 2));

    let errorMessage = error.message || "不明なエラーが発生しました";
    let errorCode = error.status || error.code;
    
    if (error.error) {
      errorMessage = error.error.message || errorMessage;
      errorCode = error.error.code || errorCode;
    }

    if (errorCode === 429 || errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("【利用制限】本日のAI生成回数の上限、または短時間のアクセス上限に達しました。しばらく時間を置いてから再度お試しください。");
    }

    if (errorCode === 500 || errorCode === 503 || errorMessage.includes("500") || errorMessage.includes("Rpc failed")) {
      throw new Error("【サーバー混雑】現在AIサーバーが混み合っています。数分待ってから再度お試しください。");
    }
    
    if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
      throw new Error("【安全フィルター】生成された画像が安全フィルターに引っかかりました。別の写真でお試しください。");
    }

    throw new Error(`AI生成エラー: ${errorMessage}`);
  }
};

// ==========================================================
// EXPORTED FUNCTIONS
// ==========================================================

export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  return generatePortrait(base64Image, ClothingOption.None, option);
};

export const applyClothingSynthesis = async (base64Image: string, option: ClothingOption): Promise<string> => {
  return generatePortrait(base64Image, option, BackgroundOption.None);
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
