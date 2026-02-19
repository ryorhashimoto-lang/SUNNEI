
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
    case BackgroundOption.SoftBlue: bgDesc = "Pale blue (soft sky blue) studio background. Gentle radial gradient from center to edges."; break;
    case BackgroundOption.SoftPink: bgDesc = "Sakura color (pale pink) studio background. Elegant and warm gradient."; break;
    case BackgroundOption.WisteriaPurple: bgDesc = "Wisteria color (pale purple) studio background. Calm and noble impression."; break;
    case BackgroundOption.FreshGreen: bgDesc = "Young grass color (fresh light green) studio background. Clean gradient."; break;
    case BackgroundOption.WhiteGrey: bgDesc = "Porcelain white (very light grey) studio background. The most standard and sophisticated plain background."; break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: PROFESSIONAL PHOTO RETOUCHER]
Synthesize a professional-quality background for a memorial photo while strictly preserving the identity of the subject.

[1. IDENTITY PRESERVATION]
- Do NOT alter the subject's face, expression, wrinkles, or hairstyle. These are the "appearance of the deceased" and must be absolutely preserved.

[2. BACKGROUND SPECIFICATION: ${bgDesc}]
- Completely remove the existing background and generate the specified background.
- Create a radial lighting effect (soft halo-like light) where the center behind the subject is slightly brighter, similar to studio portrait photography.

[3. REFINEMENT]
- Keep the subject's outline sharp while blending the boundary naturally with the background.

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
