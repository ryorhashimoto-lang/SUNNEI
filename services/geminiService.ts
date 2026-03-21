
import { ClothingOption, BackgroundOption } from "../types";


// 背景画像のパスを取得
const getBackgroundImage = (option: BackgroundOption): string | null => {
  const backgroundMap: Record<BackgroundOption, string> = {
    [BackgroundOption.None]: '',
    [BackgroundOption.Sky]: '/backgrounds/sky.png',
    [BackgroundOption.Sea]: '/backgrounds/sea.png',
    [BackgroundOption.CherryBlossom]: '/backgrounds/cherry_blossom.png',
    [BackgroundOption.FreshNewGreen]: '/backgrounds/fresh_new_green.png',
    [BackgroundOption.SoftBlue]: '/backgrounds/soft_blue.png',
    [BackgroundOption.SoftPink]: '/backgrounds/soft_pink.png',
    [BackgroundOption.WisteriaPurple]: '/backgrounds/wisteria_purple.png',
    [BackgroundOption.FreshGreen]: '/backgrounds/fresh_green.png',
    [BackgroundOption.WhiteGrey]: '/backgrounds/white_grey.png',
  };

  return backgroundMap[option] || null;
};

// 服装画像のパスを取得
const getClothingImage = (option: ClothingOption): string | null => {
  const clothingMap: Record<ClothingOption, string> = {
    [ClothingOption.None]: '',
    [ClothingOption.MensSuitBlack]: '/clothing/mens_suit_black.jpg',
    [ClothingOption.MensKimonoBlack]: '/clothing/mens_kimono_black.jpg',
    [ClothingOption.WomensSuitBlack]: '/clothing/womens_suit_black.jpg',
    [ClothingOption.WomensKimonoBlack]: '/clothing/womens_kimono_black.jpg',
  };

  return clothingMap[option] || null;
};

// Blob を base64 に変換
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};



// ==========================================================
// EXPORTED FUNCTIONS
// ==========================================================


// 背景合成（サーバー経由）
export const applyBackgroundSynthesis = async (
  base64Image: string, 
  option: BackgroundOption,
): Promise<string> => {
  try {
    if (option === BackgroundOption.None) return base64Image;

    console.log('🤖 背景合成を開始:', option);

    // パブリック背景画像を取得
    const bgImageUrl = getBackgroundImage(option);
    if (!bgImageUrl) {
      throw new Error(`背景画像が見つかりません: ${option}`);
    }

    console.log('📸 背景画像を読み込み中:', bgImageUrl);

    // 背景画像を fetch して base64 に変換
    const bgResponse = await fetch(bgImageUrl);
    if (!bgResponse.ok) {
      throw new Error(`背景画像の読み込みに失敗: ${bgResponse.statusText}`);
    }
    const bgBlob = await bgResponse.blob();
    const bgBase64 = await blobToBase64(bgBlob);

    console.log('✅ 背景画像を base64 に変換完了');
    console.log('🔄 サーバーに合成を依頼中...');

    // サーバーの新しいエンドポイントを呼び出す
    const response = await fetch('/api/synthesis/background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        portraitBase64: base64Image,
        backgroundOption: bgBase64
      })
    });

    if (!response.ok) {
  const errorData = await response.json();
  console.error('[ERROR] Backend API Error Response:', errorData);
  throw new Error(`サーバーエラー: ${errorData.message || response.statusText}`);
　　}

    const result = await response.json();
    
    // Gemini の応答から画像を抽出
    const part = result.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!part?.inlineData) {
      console.error('❌ 画像データが見つかりません');
      console.error('📋 返ってきた内容:', JSON.stringify(result, null, 2));
      throw new Error('Gemini の応答に画像がありません');
    }

    const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    console.log('✅ 背景合成完了（Gemini）');
    return imageUrl;

  } catch (error: any) {
    console.error('背景合成エラー:', error);
    throw new Error(`背景の合成に失敗しました: ${error.message}`);
  }
};

// 服装合成（サーバー経由）
export const applyClothingSynthesis = async (
  base64Image: string, 
  option: ClothingOption,
): Promise<string> => {
  try {
    if (option === ClothingOption.None) return base64Image;

    console.log('🤖 服装合成を開始:', option);

    // パブリック服装画像を取得
    const clothingImageUrl = getClothingImage(option);
    if (!clothingImageUrl) {
      throw new Error(`服装画像が見つかりません: ${option}`);
    }

    console.log('📸 服装画像を読み込み中:', clothingImageUrl);

    // 服装画像を fetch して base64 に変換
    const clothingResponse = await fetch(clothingImageUrl);
    if (!clothingResponse.ok) {
      throw new Error(`服装画像の読み込みに失敗: ${clothingResponse.statusText}`);
    }
    const clothingBlob = await clothingResponse.blob();
    const clothingBase64 = await blobToBase64(clothingBlob);

    console.log('✅ 服装画像を base64 に変換完了');
    console.log('🔄 サーバーに合成を依頼中...');

    // サーバーの新しいエンドポイントを呼び出す
    const response = await fetch('/api/synthesis/clothing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        portraitBase64: base64Image,
        clothingOption: clothingBase64
      })
    });

   if (!response.ok) {
  const errorData = await response.json();
  console.error('[ERROR] Backend API Error Response:', errorData);
  throw new Error(`サーバーエラー: ${errorData.message || response.statusText}`);
　　}

    const result = await response.json();
    
    // Gemini の応答から画像を抽出
    const part = result.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!part?.inlineData) {
      console.error('❌ 画像データが見つかりません');
      console.error('📋 返ってきた内容:', JSON.stringify(result, null, 2));
      throw new Error('Gemini の応答に画像がありません');
    }

    const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    console.log('✅ 服装合成完了（Gemini）');
    return imageUrl;

  } catch (error: any) {
    console.error('服装合成エラー:', error);
    throw new Error(`服装の合成に失敗しました: ${error.message}`);
  }
};

export const repairHeicImage = async (base64Heic: string): Promise<string> => {
    const response = await fetch('/api/repair/heic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Heic: base64Heic
      })
    });

    if (!response.ok) {
      throw new Error(`サーバーエラー: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.data) {
      throw new Error("Repair failed");
    }
    
    return `data:${result.mimeType};base64,${result.data}`;
};
