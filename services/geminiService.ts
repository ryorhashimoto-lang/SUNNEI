
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
 * Updated logic: "Digital Reshoot" & "Matte Choker"
 */
const GET_SYSTEM_PROMPT = (taskDescription: string) => `
[ROLE]
You are a High-End Digital Retoucher and Portrait Photographer.
Your task: ${taskDescription}.
Output: A hyper-realistic, studio-quality portrait for a funeral altar (Iei).

[CRITICAL: DIGITAL RESHOOT STRATEGY]
The input is a "Scanned Physical Print" with severe Halftone Dots, Paper Texture, and Harsh Flash.
DO NOT "repair" the image. Instead, "RE-IMAGINE" and "RE-PAINT" the subject.

1. GEOMETRY (STRICT IDENTITY):
   - Lock the facial landmarks (Eyes, Nose, Mouth, Bone Structure). These MUST NOT change.
   - The person must be recognizable as the same individual.

2. TEXTURE REPLACEMENT (NOISE ELIMINATION):
   - IGNORE the original pixel surface. It is damaged data.
   - DISCARD all halftone dots, white dust, and paper grain.
   - GENERATE NEW SKIN: Paint a completely new, high-definition skin layer.
   - TEXTURE: Add human pores, subsurface scattering, and natural smoothness. NO "plastic/waxy" look.

3. LIGHTING CORRECTION:
   - REMOVE FLASH GLARE: Eliminate the harsh white specular highlights on the forehead/cheeks caused by direct camera flash.
   - STUDIO LIGHTING: Simulate "Softbox Lighting" from a 45-degree angle. Soft shadows, 3D depth.

4. COMPOSITING (MATTE CHOKER):
   - ELIMINATE HALOS: The edges of the subject must be perfectly clean.
   - CHOKE THE MATTE: Intentionally erode the mask by 1-2 pixels to remove white fringe/artifacts from the cutout.
   - BLEND: Apply Ambient Occlusion shadows where the hair meets the background.
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
Replace the BACKGROUND with: ${bgDesc}

[EXECUTION STEPS]
1. EXTRACTION: Isolate the subject using the "Matte Choker" technique (erode edges).
2. GENERATION: Create the new background.
3. RE-LIGHTING: Adjust the subject's skin tone to match the new environment (Color Grading).
4. FINAL POLISH: Ensure NO white outline remains. If in doubt, darken the edges of the hair slightly.

[CONSTRAINT]
- Output must be the EXACT SAME DIMENSIONS and COMPOSITION as the input.
- REMOVE ALL NOISE/DOTS from the face.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(inputImage), mimeType } }],
      },
      config: { 
        temperature: 0.3, // Slightly increased to allow for texture regeneration
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
Change the attire to: ${clothSpec}

[EXECUTION STEPS]
1. FACE PRESERVATION: Keep the face/head geometry strict.
2. SKIN REGENERATION: While processing, RE-PAINT the face skin to remove dots/grain.
3. ATTIRE GENERATION: Generate realistic fabric texture.
4. NECK BLENDING: Pay extreme attention to the neck connection. Add contact shadows.

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
            { text: "[ROLE: RESTORATION EXPERT] Convert this HEIC image to a high-quality JPEG. ELIMINATE all noise/grain. Sharpen details." }, 
            { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }
          ] 
        },
        config: { 
          temperature: 0.3,
        }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Repair failed");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
};
