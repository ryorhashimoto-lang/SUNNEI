
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * Pads the image to match the target aspect ratio (default 1:1) to prevent Gemini from resizing the subject.
 * Using 1:1 allows for safe cropping to 5:6 later.
 */
const fitToAspect = async (base64Str: string, targetRatio: number = 1): Promise<string> => {
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
        // Image is wider than target -> Pad top/bottom
        newH = img.width / targetRatio;
      } else {
        // Image is taller than target (e.g. 5:6 < 1:1) -> Pad sides
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
 * Shared System Instructions for Memorial Photo Synthesis
 */
const GET_SYSTEM_PROMPT = (taskDescription: string) => `
[ROLE]
You are a master retoucher specializing in Japanese Memorial Photos ("Iei").
Your mission is to synthesize ${taskDescription} while strictly preserving the facial identity with forensic accuracy.

[PHASE 1: ANALYSIS & PLANNING]
1. LIGHTING ANALYSIS: Detect the original "Key Light" angle, shadow hardness, and color temperature.
2. POSE ANALYSIS: Detect the Yaw (rotation) and Pitch (up/down tilt) of the head.
   - If Pitch is LOOKING UP: Rear collar must curve UP. Shoulders appear lower.
   - If Pitch is LOOKING DOWN: Rear collar must curve DOWN. Shoulders appear higher/flatter.
3. AGE ANALYSIS: Identify the subject's age. Neck skin and shoulder slope must match the age (e.g., rounded shoulders for elderly).

[PHASE 2: ANATOMY & PHYSICS (STRICT)]
1. NECK & MUSCLES:
   - Do NOT render the neck as a simple cylinder.
   - Visualize the "Sternocleidomastoid" muscles to show tension and head rotation.
   - Use "Senile Skin" texture (fine wrinkles/pores) for the neck if the subject is elderly. Color match neck to cheeks.
2. SKELETAL STRUCTURE:
   - The collar must rest ON the CLAVICLES.
   - Create a realistic shadow gap between the back of the neck and the collar to show depth.
   - Align the tie/kimono center with the "Sternal Notch" (base of neck), NOT strictly the chin (if head is turned).
3. MATERIAL PHYSICS:
   - Simulate heavy wool fabric (approx 300g/m²). It must drape with weight, not cling like thin plastic.
   - BLACK TEXTURE: Use "Super Black" with high-frequency noise/weave texture. Matte finish. NO cheap polyester shine.
4. LIGHTING INTERACTION:
   - AMBIENT OCCLUSION: Deep shadows where the chin meets the collar. Anchor the head to the body.
   - BOUNCE LIGHT: Reflect clothing color onto the jawline (darkening the jaw if wearing black).
   - FILL LIGHT: Use gentle fill light on the clothes to maintain a peaceful, "Iei" atmosphere. Avoid overly dramatic shadows.

[PHASE 3: CRITICAL CONSTRAINTS (ABSOLUTE)]
1. FACE PROTECTION (TOPOLOGY LOCK):
   - The eyes, nose, mouth, and jawline geometry is LOCKED. Do not move pixels.
   - Do NOT smooth wrinkles, moles, or age spots. These are the subject's history and dignity.
   - Biometric fidelity must be 100%.
2. NEGATIVE CONSTRAINTS:
   - NO De-aging.
   - NO Emotion change (Do not force a smile).
   - NO AI Gloss/Shine (Keep skin organic).
   - NO Style Transfer (Must be photorealistic).
`;

/**
 * Direct Background Synthesis
 */
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Pad image to 1:1 (Square) before sending to AI
  const paddedImage = await fitToAspect(base64Image, 1);
  const mimeType = paddedImage.match(/data:([^;]+);/)?.[1] || "image/png";

  let bgDesc = "";
  switch (option) {
    case BackgroundOption.SoftBlue: 
      bgDesc = "Blue Gradient: Heavenly, airy, transition from pale cerulean to white. Peaceful."; 
      break;
    case BackgroundOption.SoftPink: 
      bgDesc = "Pink Gradient: Warm, gentle, shell-pink. Affectionate atmosphere."; 
      break;
    case BackgroundOption.WisteriaPurple: 
      bgDesc = "Wisteria Purple Gradient: Noble, elegant, high-class Japanese traditional tone."; 
      break;
    case BackgroundOption.FreshGreen: 
      bgDesc = "Mint Green Gradient: Fresh, nature-inspired, clean and restorative."; 
      break;
    case BackgroundOption.WhiteGrey: 
      bgDesc = "White/Grey Gradient: Modern, minimalist, clean studio grey."; 
      break;
    default: return base64Image;
  }

  const prompt = `
${GET_SYSTEM_PROMPT("a new background")}

[TASK: BACKGROUND REPLACEMENT]
Target Background: ${bgDesc}

[EXECUTION RULES]
1. SEPARATION: Strictly separate the subject from the background. The subject should look like a solid element in front of the gradient.
2. QUALITY: Perfectly smooth gradient. ZERO noise or color banding.
3. PRESERVATION: Do NOT touch the subject's hair, ears, or clothing edges. Keep them sharp.
4. LIGHTING: Ensure the background light does not "bleed" onto the subject excessively.

[OUTPUT]
- High Resolution, Square Aspect Ratio.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(paddedImage), mimeType } }],
      },
      config: { 
        temperature: 0.3,
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
  
  // Pad image to 1:1 (Square) before sending to AI
  const paddedImage = await fitToAspect(base64Image, 1);
  const mimeType = paddedImage.match(/data:([^;]+);/)?.[1] || "image/png";

  let clothSpec = "";
  switch (option) {
    case ClothingOption.MensSuitBlack: 
      clothSpec = "Men's Formal Mourning Suit. High-quality matte black wool. White crisp shirt. Black tie (knot centered at sternal notch)."; 
      break;
    case ClothingOption.MensKimono: 
      clothSpec = "Men's Black Crested Kimono (Montsuki Haori Hakama). Traditional dignified Japanese formal wear. White Haori-himo."; 
      break;
    case ClothingOption.WomensSuitBlack: 
      clothSpec = "Women's Black Formal Ensemble. Modest neckline. Single strand pearl necklace. Matte super-black fabric."; 
      break;
    case ClothingOption.WomensKimonoBlack: 
      clothSpec = "Women's Black Mourning Kimono (Kuro-Tomesode). Matte black silk. White collar (Haneri) visible. Black Obi. Mature and elegant."; 
      break;
    default: return base64Image;
  }

  const prompt = `
${GET_SYSTEM_PROMPT("new attire")}

[TASK: CLOTHING SYNTHESIS]
Target Attire: ${clothSpec}

[EXECUTION RULES]
1. FITTING: Fit the attire to the subject's skeletal structure (Phase 2).
2. REALISM: Add subtle "micro-wrinkles" on shoulders and lapels to show a body exists inside.
3. NECK INTEGRATION: Ensure the neck skin texture blends seamlessly with the face. No "mask" effect.
4. TEXTURE: Use noise/grain to simulate heavy wool fabric.

[OUTPUT]
- High Resolution, Square Aspect Ratio.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(paddedImage), mimeType } }],
      },
      config: { 
        temperature: 0.3,
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
        contents: { 
          parts: [
            { text: "[ROLE: RESTORATION EXPERT] Convert this HEIC image to a high-quality JPEG portrait. Enhance sharpness slightly but DO NOT alter facial features or skin texture (preserve age spots/moles)." }, 
            { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }
          ] 
        },
        config: { 
          temperature: 0.3,
        }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
