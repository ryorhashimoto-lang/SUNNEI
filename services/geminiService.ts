
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * Optimizes the image for AI processing.
 * Resizes to 3072px to allow for high-resolution texture generation.
 */
const optimizeImageForAI = async (base64Str: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 3072px allows for approx 3K resolution, sufficient for high-quality printing.
      const MAX_DIMENSION = 3072; 
      let newW = img.width;
      let newH = img.height;

      if (newW > MAX_DIMENSION || newH > MAX_DIMENSION) {
        const ratio = newW / newH;
        if (newW > newH) {
          newW = MAX_DIMENSION;
          newH = MAX_DIMENSION / ratio;
        } else {
          newH = MAX_DIMENSION;
          newW = MAX_DIMENSION * ratio;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, newW, newH);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = reject;
    img.src = base64Str;
  });
};

/**
 * Shared System Instructions for Memorial Photo Synthesis
 * Updated logic: "Digital Reshoot", "Body Integrity", & "Matte Choker"
 */
const GET_SYSTEM_PROMPT = (taskDescription: string) => `
[ROLE]
You are a High-End Digital Retoucher and Portrait Photographer.
Your task: ${taskDescription}.
Output: A hyper-realistic, studio-quality portrait for a funeral altar (Iei).

[CRITICAL: DIGITAL RESHOOT STRATEGY]
The input is a "Scanned Physical Print" with severe Halftone Dots, Paper Texture, and often contains unwanted people (occlusions).
DO NOT "repair" the image. Instead, "RE-IMAGINE" and "RE-PAINT" the subject.

1. SUBJECT ISOLATION (ELIMINATE OTHERS):
   - Identify the MAIN SUBJECT (the person intended for the portrait).
   - REMOVE ALL OTHER PEOPLE (babies, spouses, etc.) and objects from the frame.
   - The output must contain ONLY the main subject.

2. BODY INTEGRITY (INPAINTING OCCLUSIONS):
   - **EXTREMELY IMPORTANT**: When removing a person/object blocking the main subject (e.g., a baby in arms), DO NOT replace that area with background.
   - **RECONSTRUCT THE BODY**: You must infer and paint the subject's missing chest, stomach, or arms behind the removed object.
   - **EXTEND CLOTHING**: seamlessy extend the pattern/texture of the subject's visible clothes to fill the void.
   - The subject must look like they were standing alone from the start.

3. TEXTURE REGENERATION (NOISE ELIMINATION):
   - IGNORE the original pixel surface. It is damaged data.
   - DISCARD all halftone dots, white dust, and paper grain.
   - GENERATE NEW SKIN: Paint a completely new, high-definition skin layer with pores and subsurface scattering.

4. LIGHTING CORRECTION:
   - REMOVE FLASH GLARE: Eliminate harsh white specular highlights.
   - STUDIO LIGHTING: Simulate "Softbox Lighting" from a 45-degree angle.

5. COMPOSITING (MATTE CHOKER):
   - ELIMINATE HALOS: The edges of the subject must be perfectly clean.
   - CHOKE THE MATTE: Intentionally erode the mask by 1-2 pixels to remove white fringe.
`;

/**
 * Direct Background Synthesis
 */
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const inputImage = await optimizeImageForAI(base64Image);
  const mimeType = inputImage.match(/data:([^;]+);/)?.[1] || "image/jpeg";

  let bgDesc = "";
  switch (option) {
    case BackgroundOption.SoftBlue: 
      bgDesc = "Blue Gradient: Heavenly, airy, transition from pale cerulean to white. Peaceful atmosphere."; 
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
${GET_SYSTEM_PROMPT("background replacement")}

[TASK]
1. Remove any people/objects blocking the main subject.
2. RECONSTRUCT the subject's body/clothes where the objects were removed.
3. Replace the BACKGROUND with: ${bgDesc}

[EXECUTION STEPS]
1. PRE-PROCESS: Identify occlusions (other people).
2. INPAINT: Draw the missing parts of the subject's body/clothes.
3. EXTRACTION: Isolate the now-complete subject using "Matte Choker".
4. BACKGROUND: Generate the new background.
5. RE-LIGHTING: Match skin tone to new background.

[CONSTRAINT]
- Output must be the SAME DIMENSIONS.
- Face identity MUST be preserved.
- NO white outlines.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(inputImage), mimeType } }],
      },
      config: { 
        temperature: 0.2,
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
  
  const inputImage = await optimizeImageForAI(base64Image);
  const mimeType = inputImage.match(/data:([^;]+);/)?.[1] || "image/jpeg";

  let clothSpec = "";
  switch (option) {
    case ClothingOption.MensSuitBlack: 
      clothSpec = "Men's Formal Mourning Suit. High-quality matte black wool. White crisp shirt. Black tie (knot centered)."; 
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
${GET_SYSTEM_PROMPT("clothing synthesis")}

[TASK]
1. Remove any people/objects blocking the main subject.
2. Change the attire to: ${clothSpec}

[EXECUTION STEPS]
1. FACE PRESERVATION: Keep the face/head geometry strict.
2. BODY RECONSTRUCTION: If the original body was hidden by another person, generate the new clothing shape as if standing alone.
3. SKIN REGENERATION: RE-PAINT the face skin to remove dots/grain.
4. NECK BLENDING: Pay extreme attention to the neck connection.

[CONSTRAINT]
- Output must be the SAME DIMENSIONS. Do not resize the head.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(inputImage), mimeType } }],
      },
      config: { 
        temperature: 0.2,
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
            { text: "[ROLE: RESTORATION EXPERT] Convert this HEIC image to a high-quality JPEG. ELIMINATE all noise/grain. Sharpen details." }, 
            { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }
          ] 
        },
        config: { 
          temperature: 0.2,
        }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Repair failed");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
};
