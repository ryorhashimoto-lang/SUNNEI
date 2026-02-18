
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
    case BackgroundOption.SoftBlue: bgDesc = "浅葱色（柔らかなスカイブルー）のスタジオ背景。中心から外側へ緩やかなラジアルグラデーション。"; break;
    case BackgroundOption.SoftPink: bgDesc = "桜色（淡いピンク）のスタジオ背景。上品で温かみのあるグラデーション。"; break;
    case BackgroundOption.WisteriaPurple: bgDesc = "藤色（淡いパープル）のスタジオ背景。落ち着いた高貴な印象。"; break;
    case BackgroundOption.FreshGreen: bgDesc = "若草色（爽やかなライトグリーン）のスタジオ背景。清潔感のあるグラデーション。"; break;
    case BackgroundOption.WhiteGrey: bgDesc = "白磁色（ごく明るいグレー）のスタジオ背景。最も標準的で洗練された無地背景。"; break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: PROFESSIONAL PHOTO RETOUCHER]
遺影写真として、人物の同一性を完全に保ったまま、背景をプロフェッショナルな品質で合成してください。

[1. IDENTITY PRESERVATION]
- 被写体の顔、表情、シワ、髪型は一切変更しないでください。これらは絶対に保護されるべき「故人の姿」です。

[2. BACKGROUND SPECIFICATION: ${bgDesc}]
- 既存の背景を完全に削除し、指定の背景を生成してください。
- スタジオでのポートレート撮影のように、被写体の背後中心が少し明るくなるラジアルライティング（後光のような柔らかい光）を表現してください。

[3. REFINEMENT]
- 人物の輪郭をシャープに保ちつつ、背景との境界を自然に馴染ませてください。

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
    case ClothingOption.MensKimono: clothSpec = "男性用の格式高い黒紋付羽織袴。胸に白い家紋。"; break;
    case ClothingOption.MensSuitNavy: clothSpec = "落ち着いたダークネイビーのビジネススーツ。"; break;
    case ClothingOption.WomensSuitBlack: clothSpec = "女性用の黒い喪服アンサンブル。上品な一連のパールネックレス。"; break;
    case ClothingOption.WomensKimonoBlack: clothSpec = "女性用の格式高い黒喪服（着物）、白い半襟、黒い帯。"; break;
    case ClothingOption.WomensKimonoColor: clothSpec = "上品で淡い色合い（訪問着や色無地）の和服。"; break;
    default: return base64Image;
  }

  const prompt = `
[ROLE: DIGITAL TAILOR]
現在の写真の「顔」を維持したまま、服装のみを高品質なフォーマルウェアに変更してください。

[1. IDENTITY]
- 顔、表情、髪型、視線は1ピクセルも変更しないでください。

[2. ATTIRE: ${clothSpec}]
- 人物の骨格（肩幅、首の太さ）に合わせて、衣装を自然にフィットさせてください。
- 着物やスーツの質感をリアルに再現してください。

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
        contents: { parts: [{ text: "Convert to high quality 3:4 portrait photo." }, { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
