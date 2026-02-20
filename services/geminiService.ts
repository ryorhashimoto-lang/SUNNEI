
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
 * Updated logic: Frequency Separation & Light Wrap
 */
const GET_SYSTEM_PROMPT = (taskDescription: string) => `
[ROLE]
You are a legendary Photo Restoration Master & VFX Compositor.
Your task: ${taskDescription}.
Output: A hyper-realistic 8K portrait suitable for a funeral altar (Iei).

[CRITICAL: TEXTURE RECONSTRUCTION (FREQUENCY SEPARATION)]
The input image is a SCANNED PHYSICAL PHOTO containing "Paper Grain", "Halftone Dots", "Film Grain", and "Surface Scratches".
1. LOW FREQUENCY (Geometry): STRICTLY PRESERVE facial structure (Identity). Do not change the shape of eyes, nose, or mouth.
2. HIGH FREQUENCY (Texture): DISCARD the original surface texture. It is noise.
   - IGNORE: Scan lines, white dust spots, paper roughness, dot patterns.
   - GENERATE: NEW, high-definition human skin texture (pores, vellus hair, natural smoothness).
   - GOAL: The result must look like it was shot with a modern 100MP digital camera, NOT a scan of a print.

[CRITICAL: COMPOSITING & LIGHTING]
1. NO HALOS: Do NOT draw a white glowing line around the subject.
2. DEFRINGE: Remove any white/black artifacts from the original cutout edges.
3. LIGHT WRAP: Simulate "Environmental Light Wrap". The background color/light should slightly bleed into the very edges of the hair and clothes to blend them naturally.
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
Replace the OLD BACKGROUND with: ${bgDesc}

[EXECUTION STEPS]
1. SEGMENTATION: Identify the person (Face, Hair, Shoulders).
2. REMOVAL: Delete the old background completely.
3. COMPOSITING: Place the subject into the new background.
4. BLENDING (CRITICAL):
   - Apply "Light Wrap": The new background color (${bgDesc}) must influence the edges of the subject's hair.
   - Anti-Aliasing: Ensure the edges are soft and natural. NO "cutout sticker" look.
   - Color Decontamination: Remove any color cast from the OLD background on the subject's skin.

[CONSTRAINT]
- Output must be the EXACT SAME DIMENSIONS and COMPOSITION as the input.
- REMOVE all white specks and scratches from the face.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(inputImage), mimeType } }],
      },
      config: { 
        temperature: 0.2, // Low temperature for precision
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
1. FACE LOCK: Keep the face, hair, and head orientation exactly as is.
2. TEXTURE REPAIR: While changing clothes, also REPAIR the face texture (remove dots/scratches) as per system instructions.
3. CLOTHING GENERATION:
   - Generate the new clothing from the neck down.
   - Fabric Weight: Ensure the material looks heavy (Wool/Silk), not like paper.
   - Lighting: Cast shadows on the collar based on the Light Vector Analysis.

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
    // Uses restoration prompt to clean up the image during conversion
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { 
          parts: [
            { text: "[ROLE: RESTORATION EXPERT] Convert this HEIC image to a high-quality JPEG portrait. Enhance sharpness and remove noise while STRICTLY maintaining facial geometry (eyes, nose, mouth)." }, 
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
