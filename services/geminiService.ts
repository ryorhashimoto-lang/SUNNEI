
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
 * 遺影写真特有の「中心が白の放射状グラデーション」を生成しつつ、人物を完全保護
 */
export const applyBackgroundColor = async (base64Image: string, colorCode: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  const prompt = `遺影写真作成のための高度な画像編集タスクです。

【1. 被写体の完全保護と分離】
- 保護対象: 中央に写っている「一人の人物」のすべて（顔、表情、髪型、首、肩のライン、体、衣服の質感）を完全に維持してください。
- 侵食禁止: 背景色が人物の肩や体、衣服に染み込んだり、透けたり、輪郭を削り取ったりすることを厳禁します。人物のシルエットをシャープに保ってください。

【2. 不要なオブジェクトの除去と補完】
- 除去対象: 被写体以外の人物の体の一部（肩に置かれた手、隣接する人物の袖や体など）が写り込んでいる場合は、それらを完全に消去してください。
- インペインティング: 除去した箇所の下にあるべき被写体の衣服や肩を、周囲の質感と一致するように自然に描き足して（補完して）ください。

【3. プロフェッショナル背景デザイン】
- 放射状後光（ハロー効果）: 人物の頭部の真後ろを純粋な白色（#FFFFFF）とし、そこから外側に向かって「${colorCode}」へ滑らかに変化する放射状グラデーションを生成してください。
- 奥行き: スタジオで撮影されたような、上品で立体感のあるライティングを表現してください。

【4. 顔の同一性】
- 顔のパーツ（目、鼻、口、シワ）、表情、肌の質感は一切変更せず、元の写真を100%継承してください。

【出力設定】
- アスペクト比: 3:4 (縦長)`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("背景生成に失敗しました。");
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
      clothText = "男性用の高級な黒の礼服（ブラックスーツ）、清潔感のある白いワイシャツ、黒いネクタイ。"; 
      break;
    case EditAction.KIMONO_MENS: 
      clothText = "男性用の伝統的で格調高い黒紋付羽織。"; 
      break;
    case EditAction.SUIT_WOMENS: 
      clothText = "女性用のフォーマルな黒の喪服、首元には一連のパールのネックレス。"; 
      break;
    case EditAction.KIMONO_WOMENS: 
      clothText = "女性用の格調高い黒紋付喪服、清楚な白い半襟。"; 
      break;
  }

  const prompt = `現在の「人物の顔」と「背景」を完全に維持したまま、服装のみを「${clothText}」に高品質に差し替えてください。

【厳守事項】
1. 顔の同一性: 顔、表情、髪型を絶対に描き直さないでください。
2. 背景の維持: 現在の背景色やグラデーションを1ピクセルも変更しないでください。
3. フィッティング: 新しい衣装が人物の首のライン、肩の幅と完璧に一致するように生成してください。
4. 不要物の除去: もし元の写真に他人の手などが肩にかかっていたとしても、この新しい衣装で完全に隠し、一人だけのポートレートとして完成させてください。`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("着せ替え生成に失敗しました。");
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
        contents: { parts: [{ text: "Convert this image to high quality 3:4 JPEG." }, { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
