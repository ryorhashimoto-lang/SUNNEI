
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * 背景の直接合成
 */
export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  let bgDesc = "";
  switch (option) {
    case BackgroundOption.SoftBlue: bgDesc = "淡いブルーのラジアルグラデーション。中心を明るく。"; break;
    case BackgroundOption.SoftPink: bgDesc = "淡いピンク（桜色）のラジアルグラデーション。"; break;
    case BackgroundOption.WisteriaPurple: bgDesc = "上品な藤色（ラベンダー）のグラデーション。"; break;
    case BackgroundOption.FreshGreen: bgDesc = "薄い若草色のグラデーション。"; break;
    case BackgroundOption.WhiteGrey: bgDesc = "清潔感のある明るいグレーの背景。"; break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: PROFESSIONAL PHOTO RETOUCHER]
遺影写真として、人物の同一性を完全に保ったまま、背景をプロフェッショナルな品質で合成してください。

[1. IDENTITY PRESERVATION]
- 被写体の顔（目、鼻、口、表情、シワ、髪型）は一切変更しないでください。これらは保護対象です。

[2. BACKGROUND SPECIFICATION: ${bgDesc}]
- 既存の背景を削除し、指定の背景を生成してください。
- スタジオ撮影のような、被写体の背後から柔らかい光が当たっているようなラジアルライティング（中心が明るい）を表現してください。

[3. REFINEMENT]
- 人物の輪郭をシャープに保ちつつ、背景との境目に不自然な浮きがないよう、光を馴染ませてください。

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
    if (!part?.inlineData) throw new Error("背景生成失敗");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * 衣装の着せ替え合成
 */
export const applyClothingSynthesis = async (base64Image: string, option: ClothingOption): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  let clothSpec = "";
  switch (option) {
    case ClothingOption.MensSuitBlack: clothSpec = "男性用の高級な黒礼服（ブラックスーツ）、白いワイシャツ、黒いネクタイ。"; break;
    case ClothingOption.MensKimono: clothSpec = "男性用の格式高い黒紋付羽織。胸に白い紋。"; break;
    case ClothingOption.MensSuitNavy: clothSpec = "落ち着いた紺色のスーツ。"; break;
    case ClothingOption.WomensSuitBlack: clothSpec = "女性用の黒い喪服アンサンブル。一連の白いパールのネックレス。"; break;
    case ClothingOption.WomensKimonoBlack: clothSpec = "女性用の伝統的な黒喪服（着物）、白い半襟。"; break;
    case ClothingOption.WomensKimonoColor: clothSpec = "上品な淡い色合いの色無地または訪問着。"; break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: DIGITAL TAILOR]
現在の写真の「顔」と「背景」を維持したまま、服装のみを高品質なフォーマルウェアに変更してください。

[1. IDENTITY]
- 顔、表情、髪型、視線は1ピクセルも変更しないでください。

[2. ATTIRE: ${clothSpec}]
- 人物の骨格（肩幅、首の太さ）に合わせて、衣装を自然にフィットさせてください。
- 着せ替え特有の不自然さを無くし、実際にその服を着てスタジオで撮影したような質感にしてください。

[3. COMPOSITION]
- 元の人物の頭部の位置とサイズを維持してください。

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
    if (!part?.inlineData) throw new Error("着せ替え失敗");
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
        contents: { parts: [{ text: "Convert to high quality 3:4 JPEG portrait." }, { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
