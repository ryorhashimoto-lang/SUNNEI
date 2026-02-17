
import { GoogleGenAI } from "@google/genai";
import { EditAction } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * 背景色変更（AI直接合成）
 * カラーコードで指定された均一な色に背景を差し替える
 */
export const applyBackgroundColor = async (base64Image: string, colorCode: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  const prompt = `遺影写真の背景変更タスクです。
元画像の人物（顔・表情・服装・髪型）を一切変えずに、背景のみをカラーコード「${colorCode}」の均一なベタ塗りに変更してください。

【厳守事項】
1. 背景色: ムラ、グラデーション、影、テクスチャを一切入れないでください。指定されたカラー「${colorCode}」だけで100%フラットに塗りつぶしてください。
2. 境界線の馴染み: 髪の毛の一本一本や肩のラインが、新しい背景色とプロレベルで自然に馴染むように（アンチエイリアス処理）生成してください。切り抜き感を出さないでください。
3. 同一性の維持: 本人の顔の造作（目、鼻、口、耳、肌の質感、シワ、ホクロ、表情）を1%も変更しないでください。
4. 出力サイズ: 3:4のアスペクト比を維持してください。`;

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
    console.error("Apply Background Error:", error);
    throw error;
  }
};

/**
 * 服装着せ替え（AI直接合成）
 */
export const applyClothingChange = async (base64Image: string, action: EditAction): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  let clothText = "";
  switch (action) {
    case EditAction.SUIT_MENS: 
      clothText = "男性用の高級な黒の礼服（ブラックスーツ）、白いワイシャツ、黒いネクタイ。"; 
      break;
    case EditAction.KIMONO_MENS: 
      clothText = "男性用の伝統的な黒紋付羽織。家紋が見える必要はありません。"; 
      break;
    case EditAction.SUIT_WOMENS: 
      clothText = "女性用の黒の喪服（ブラックフォーマル）、首元に一連のパールのネックレス。"; 
      break;
    case EditAction.KIMONO_WOMENS: 
      clothText = "女性用の伝統的な黒紋付喪服、清楚な白い半襟。"; 
      break;
  }

  const prompt = `元画像の顔の表情と現在の背景色を完全に維持したまま、服装のみを「${clothText}」に高品質に差し替えてください。

【最重要事項】
1. 顔の保護: 顔のパーツ、肌の質感、表情、髪型を一切描き直さないでください。人物のアイデンティティを完全に維持することが必須です。
2. 馴染ませ: 首元と新しい衣服の境界線が、物理的に自然につながるように描画してください。
3. 背景の維持: 現在の背景色を1ピクセルも変えず、そのまま引き継いでください。
4. 質感: 遺影として相応しい、落ち着いたマットな布の質感を表現してください。
5. 構図: 元画像の人物のズーム率と位置を維持してください。`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("着せ替え生成失敗");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) {
    console.error("Apply Clothing Error:", error);
    throw error;
  }
};

export const repairHeicImage = async (base64Heic: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [{ text: "Convert this HEIC image to high quality 3:4 JPEG." }, { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
