
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * Pads the image to match the target aspect ratio (default 3:4) to prevent Gemini from resizing the subject.
 */
const fitToAspect = async (base64Str: string, targetRatio: number = 3/4): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const currentRatio = img.width / img.height;
      // If close enough, return original
      if (Math.abs(currentRatio - targetRatio) < 0.01) {
        resolve(base64Str);
        return;
      }

      const canvas = document.createElement('canvas');
      let newW = img.width;
      let newH = img.height;

      // Adjust dimensions to enclose the original image within the target aspect ratio
      if (currentRatio > targetRatio) {
        // Image is wider than target (e.g., 5:6 > 3:4) -> Pad top/bottom
        newH = img.width / targetRatio;
      } else {
        // Image is taller than target -> Pad sides (unlikely for 5:6 -> 3:4)
        newW = img.height * targetRatio;
      }

      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // Fill with white (neutral) - AI will replace this background anyway
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, newW, newH);

      // Center the image
      const x = (newW - img.width) / 2;
      const y = (newH - img.height) / 2;
      ctx.drawImage(img, x, y);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = base64Str;
  });
};

/**
 * Direct Background Synthesis
 */
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Pad image to 3:4 before sending to AI
  const paddedImage = await fitToAspect(base64Image, 3/4);
  const mimeType = paddedImage.match(/data:([^;]+);/)?.[1] || "image/png";

  let bgDesc = "";
  switch (option) {
    case BackgroundOption.SoftBlue: 
      bgDesc = "Icy pale blue, bright sky. Very light and airy."; 
      break;
    case BackgroundOption.SoftPink: 
      bgDesc = "Very pale shell pink. Soft, warm and heavenly."; 
      break;
    case BackgroundOption.WisteriaPurple: 
      bgDesc = "Very pale lavender mist, almost white. Elegant and noble."; 
      break;
    case BackgroundOption.FreshGreen: 
      bgDesc = "Very pale mint cream. Fresh and clean."; 
      break;
    case BackgroundOption.WhiteGrey: 
      bgDesc = "Porcelain white, simple studio background."; 
      break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: PROFESSIONAL PHOTO RETOUCHER]
Synthesize a professional studio background while strictly preserving the subject's identity.

[1. IDENTITY PRESERVATION]
- ABSOLUTELY DO NOT alter the subject's face, expression, wrinkles, or hairstyle.
- The subject must remain 100% OPAQUE.

[2. LIGHTING: FLAT STUDIO LIGHTING]
- Apply "Standard Studio Lighting" (Neutral & Even) to the subject.
- REMOVE all "High-key" bloom, glow, or overexposure effects from the subject.
- PREVENT environmental light wrapping. The background light must NOT bleed onto the subject.
- Ensure the subject has distinct, sharp edges.

[3. BACKGROUND SPECIFICATION: ${bgDesc}]
- Completely remove the existing background.
- Generate a smooth, clean gradient background.
- NO vignette. NO textures.

[4. COMPOSITION]
- STRICTLY SEPARATE the subject from the background.
- The subject should look like a solid cutout placed in front of the background.
- No color blending at the boundaries.

[OUTPUT]
- 3:4 Aspect Ratio, High Resolution.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(paddedImage), mimeType } }],
      },
      config: { 
        temperature: 0.3,
        imageConfig: { aspectRatio: "3:4" } 
      }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Background generation failed");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * Clothing Change Synthesis
 */
export const applyClothingSynthesis = async (base64Image: string, option: ClothingOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Pad image to 3:4 before sending to AI
  const paddedImage = await fitToAspect(base64Image, 3/4);
  const mimeType = paddedImage.match(/data:([^;]+);/)?.[1] || "image/png";

  let clothSpec = "";
  switch (option) {
    case ClothingOption.MensSuitBlack: clothSpec = "Men's high-quality black formal suit, white dress shirt, black tie."; break;
    case ClothingOption.MensKimono: clothSpec = "Men's prestigious black formal haori and hakama. Plain black haori without family crest symbols."; break;
    case ClothingOption.WomensSuitBlack: clothSpec = "Women's black mourning ensemble. Elegant single-strand pearl necklace."; break;
    case ClothingOption.WomensKimonoBlack: clothSpec = "Women's prestigious black mourning kimono (kuro-montsuki), white semi-collar, black obi."; break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: DIGITAL TAILOR]
Change only the attire to high-quality formal wear while maintaining the "face" in the current photo.

[1. IDENTITY]
- Do not change the face, expression, hairstyle, or gaze by even a single pixel.

[2. ATTIRE: ${clothSpec}]
- Naturally fit the attire to the subject's skeletal structure (shoulder width, neck thickness).
- Realistically reproduce the texture of the kimono or suit.

[3. COMPOSITION]
- Maintain the position and size of the original subject's head.
- Ensure the clothing is opaque and does not blend with the background.
- Use flat lighting to avoid bloom/glow effects.

[OUTPUT]
- 3:4 Aspect Ratio.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(paddedImage), mimeType } }],
      },
      config: { 
        temperature: 0.3,
        imageConfig: { aspectRatio: "3:4" } 
      }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Clothing change failed");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const repairHeicImage = async (base64Heic: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [{ text: "Convert to high quality 3:4 portrait photo." }, { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }] },
        config: { 
          temperature: 0.3,
          imageConfig: { aspectRatio: "3:4" } 
        }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
