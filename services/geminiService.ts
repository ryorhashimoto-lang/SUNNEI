
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * Direct Background Synthesis
 */
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

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
      bgDesc = "Porcelain white, high-key. Pure and simple."; 
      break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: PROFESSIONAL PHOTO RETOUCHER]
Synthesize a professional-quality background for a memorial photo while strictly preserving the identity of the subject.

[1. IDENTITY PRESERVATION]
- Do NOT alter the subject's face, expression, wrinkles, or hairstyle. These are the "appearance of the deceased" and must be absolutely preserved.

[2. TONE & STYLE: High-key photography, Bright and Airy]
- Create a "High-key" lighting effect. The entire image should be bright and transparent.
- Use a "White vignette" effect (fade to white at the edges), NOT dark.
- No dark shadows. No muddy colors. No heavy vignetting.

[3. BACKGROUND SPECIFICATION: ${bgDesc}]
- Completely remove the existing background.
- Generate a smooth, gradient studio background based on the description above.
- Ensure the background is very pale, almost pastel or white-tinted.

[4. REFINEMENT]
- Keep the subject's outline sharp while blending the boundary naturally with the bright background.

[OUTPUT]
- 3:4 Aspect Ratio, High Resolution.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
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
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

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

[OUTPUT]
- 3:4 Aspect Ratio.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
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
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
