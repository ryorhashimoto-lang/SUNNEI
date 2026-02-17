
import { GoogleGenAI } from "@google/genai";
import { EditAction } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * 人物抽出プロンプト
 */
export const extractPerson = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  const prompt = `遺影作成のための人物分離タスクです。
背景を完全に除去し、ムラのない均一な「#00FF00 (純粋な緑)」で塗りつぶしてください。

【注意】
1. 顔の微細なディテール（瞳の中の光、皮膚の質感、シワ）を絶対に滑らかにしないでください。
2. 背景との境界線付近に元の背景色を残さないでください。
3. 背景には影や照明効果を一切入れず、フラットなベタ塗りにしてください。
4. 出力サイズとアスペクト比(3:4)を厳守してください。`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("抽出失敗");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * 服装着せ替えプロンプト
 */
export const changeClothing = async (base64Image: string, action: EditAction): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  let clothText = "";
  switch (action) {
    case EditAction.SUIT_MENS: 
      clothText = "男性用のフォーマルな黒の礼服、白いシャツ、黒いネクタイ。胸から上の近接構図。"; 
      break;
    case EditAction.KIMONO_MENS: 
      clothText = "男性用の黒紋付羽織。胸から上の襟元のみを描写し、袴（はかま）は絶対に描かないでください。"; 
      break;
    case EditAction.SUIT_WOMENS: 
      clothText = "女性用の黒の喪服、パールのネックレス。胸から上の近接構図。"; 
      break;
    case EditAction.KIMONO_WOMENS: 
      clothText = "女性用の黒紋付喪服、白い半襟。胸から上の襟元のみを描写し、帯や下半身は絶対に描かないでください。"; 
      break;
  }

  const prompt = `元画像の「人物の大きさ（ズーム率）」「顔の位置」「表情」を完全に維持したまま、服装のみを「${clothText}」に変更してください。

【最重要・厳守事項】
1. 構図の維持: 袴（はかま）や帯を描くために人物を小さくして「引きの構図」にすることは絶対に禁止です。元画像がアップであれば、そのアップのまま首から下だけを差し替えてください。
2. 顔の保存: 目、鼻、口、髪型、シワなどの特徴を1ピクセルも描き直したり動かしたりしないでください。
3. 背景: 一切の影やムラがない「#00FF00 (純粋な緑)」で塗りつぶしてください。
4. 質感: 写真として自然な布地の質感（落ち着いたマットな黒）を表現してください。
5. 接続: 首元と衣服の境界を、不自然な隙間や段差がないよう滑らかに繋げてください。`;

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
        contents: { parts: [{ text: "Convert to high quality 3:4 JPEG." }, { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
