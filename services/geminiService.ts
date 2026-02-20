
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
 * Simple resizing to max dimension to ensure speed and prompt adherence,
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

      ctx.drawImage(img, 0, 0, newW, newH);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = base64Str;
  });
};

/**
 * Shared System Instructions for Memorial Photo Synthesis
 * Updated for Optical Consistency, Anatomical Projection, and Color Separation.
 */
const GET_SYSTEM_PROMPT = (taskDescription: string) => `
[ROLE]
You are a forensic-level Digital Compositor and Lighting Expert specializing in Japanese Memorial Photos ("Iei").
Your goal is to perform ${taskDescription} with absolute fidelity to the subject's identity while integrating them into a new environment with perfect optical physics.

[CRITICAL PROTOCOL: IDENTITY PRESERVATION]
1. NO GEOMETRY SHIFT: The eyes, nose, mouth, and facial outline must remain in the EXACT same pixel coordinates.
2. NO BEAUTY FILTERS: Do not smooth skin, remove wrinkles, or alter age spots. These are vital for identification.
3. NO EXPRESSION CHANGE: Maintain the original gaze and expression 100%.

[PHYSICS ENGINE: LIGHT & MATERIAL]
1. LIGHT VECTOR ALIGNMENT:
   - Analyze the highlight on the forehead/nose to determine the original light source direction (e.g., Top-Left 45°).
   - Ensure all new shadows (on generated clothes or background) follow this EXACT vector.
2. MATERIAL REFLECTANCE (NO COLOR BLEED):
   - SKIN (Matte): 0% environmental reflection. Keep natural skin tones. DO NOT tint the face with the background color.
   - HAIR/CLOTH (Semi-Gloss): 5% reflection of ambient light at the edges ONLY (Rim Light).
3. ATMOSPHERIC INTEGRATION:
   - Apply subtle "Rim Lighting" (background color reflection) to the outer 1-2px pixels of the hair and shoulders to remove the "cutout" look.
   - NEVER blend background color into the center of the face.

[ANATOMY ENGINE: 3D PROJECTION]
1. SKULL ORIENTATION: Estimate the head's Yaw, Pitch, and Roll.
2. BODY ALIGNMENT:
   - If Head Yaw is > 0 (looking right), the Left Shoulder must recede in depth (Perspective).
   - Adjust collar height asymmetry based on Head Roll.
3. SHADOW INTEGRATION: Cast a natural occlusion shadow from the chin onto the collar.
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
1. SEGMENTATION: Identify the person (Face, Hair, Shoulders) with sub-pixel precision.
2. REMOVAL: Delete the old background completely.
3. INPAINTING: Fill the removed area with the Target Gradient.
4. OPTICAL BLENDING (CRITICAL):
   - Analyze the background color (e.g., Blue).
   - Apply a very thin "Rim Light" of that color to the edges of the hair.
   - STRICTLY FORBID applying this color to the face skin. The face must remain warm and natural.

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
        temperature: 0.2, // Lower temperature for stricter adherence to physics rules
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
2. ANATOMICAL ANALYSIS:
   - Determine Head Yaw/Pitch.
   - Construct a mental 3D model of the torso that aligns with this head angle.
   - If the face is turned, turn the body accordingly (Do not paste a flat frontal body on a turned head).
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
        temperature: 0.2, // Lower temperature for stricter adherence to anatomy rules
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
    // This function can optionally use a slightly higher temperature if creative restoration is needed,
    // but for simple conversion, stability is better.
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
          temperature: 0.2,
        }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Repair failed");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
};
