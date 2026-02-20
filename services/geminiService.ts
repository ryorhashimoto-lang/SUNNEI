
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
 * REMOVED: Padding to 1:1 aspect ratio (caused the "box" effect).
 * ADDED: Simple resizing to max dimension to ensure speed and prompt adherence,
 * while STRICTLY preserving the original aspect ratio and composition.
 */
const optimizeImageForAI = async (base64Str: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIMENSION = 1024; // Optimal for Gemini Flash
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

      // Draw exactly the original image, no padding, no distortion
      ctx.drawImage(img, 0, 0, newW, newH);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = base64Str;
  });
};

/**
 * Shared System Instructions for Memorial Photo Synthesis
 * Updated to fix "Blue Halo" and "Position Shift" issues.
 */
const GET_SYSTEM_PROMPT = (taskDescription: string) => `
[ROLE]
You are a master digital compositor and retouching expert for Japanese Memorial Photos ("Iei").
Your goal is to perform ${taskDescription} with forensic accuracy.

[CRITICAL RULE: NO BOX / NO HALO]
- The input image is a crop from an old photo. It has an internal background (walls, curtains, etc.).
- **DO NOT** treat the rectangular border of the image as the subject.
- **DO NOT** just paint around the image border.
- You MUST perform "CHROMA KEY" style extraction:
  1. Identify the person (Face, Hair, Shoulders).
  2. Treat EVERYTHING else (walls, shadows, noise behind head) as "Green Screen" to be removed.
  3. Replace the background *behind* the hair strands, not just around the head.

[CRITICAL RULE: GEOMETRY LOCK (NO SHIFT)]
- **DO NOT ZOOM.**
- **DO NOT SHIFT.**
- **DO NOT CROP.**
- The subject's head MUST remain in the EXACT same pixel coordinates as the input.
- You are painting *underneath* the subject, not moving the subject.

[PHASE 1: IDENTITY PRESERVATION]
- The face (Eyes, Nose, Mouth, Ears, Facial Structure) is HOLY.
- Do not apply "Beauty Filters". Do not smooth deep wrinkles or moles.
- Preserve the "Source Identity" 100%.

[PHASE 2: ANATOMY & PHYSICS]
- NECK: Connect the head naturally to the body. If the original photo has no neck visible, generate a realistic neck based on age.
- CLOTHING: Ensure the collar sits on the clavicles properly.
- DEPTH: Create realistic ambient occlusion shadows where the chin meets the clothing/neck.
`;

/**
 * Direct Background Synthesis
 */
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use optimized image (original aspect ratio, no padding)
  const inputImage = await optimizeImageForAI(base64Image);
  const mimeType = inputImage.match(/data:([^;]+);/)?.[1] || "image/jpeg";

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
${GET_SYSTEM_PROMPT("background replacement")}

[TASK]
Replace the OLD BACKGROUND with: ${bgDesc}

[STEPS]
1. SEGMENTATION: Find the exact contour of the person.
2. REMOVAL: Delete the old background completely (walls, patterns, noise).
3. INPAINTING: Fill the removed area with the Target Gradient.
4. BLENDING: Soften the edges of the hair slightly to blend with the new background (Antialiasing).

[CONSTRAINT]
- Output must be the EXACT SAME DIMENSIONS and COMPOSITION as the input.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(inputImage), mimeType } }],
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
  
  // Use optimized image (original aspect ratio, no padding)
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
Change the attire to: ${clothSpec}

[STEPS]
1. FACE LOCK: Keep the face, hair, and head orientation exactly as is.
2. BODY GENERATION: Generate the new clothing from the neck down.
3. ADAPTATION: If the original image is cropped tight at the chin, EXTEND the canvas downwards slightly if needed to show the collar, but prefer fitting within the current frame.
4. REALISM: The clothes must have weight and texture (wool/silk).

[CONSTRAINT]
- Output must be the EXACT SAME DIMENSIONS and COMPOSITION as the input. Do not resize the head.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(inputImage), mimeType } }],
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
