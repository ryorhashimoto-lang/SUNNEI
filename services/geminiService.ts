import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  return dataUrl.split(',')[1];
};

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

// Retry helper function
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransient = 
      error.status === 500 || 
      error.status === 503 ||
      (error.error && (error.error.code === 500 || error.error.code === 503)) ||
      (error.message && (
        error.message.includes("500") || 
        error.message.includes("Rpc failed") || 
        error.message.includes("overloaded") || 
        error.message.includes("unavailable")
      ));

    if (retries > 0 && isTransient) {
      console.warn(`Transient error detected. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * 背景合成：ユーザー画像 + public 背景画像を Gemini で合成
 */
export const applyBackgroundSynthesis = async (
  base64Image: string,
  option: BackgroundOption,
): Promise<string> => {
  try {
    if (option === BackgroundOption.None) return base64Image;

    console.log('🤖 背景合成を開始:', option);

    // public 背景画像を取得
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
    console.log('🔄 Gemini で合成中...');

    // Gemini SDK で直接合成
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
🔴 [最重要：人物は絶対に動かさない・大きさを変えない・位置を変えない]

You are a world-class professional image composition engineer specializing in photorealistic background replacement.

MOST CRITICAL INSTRUCTION:
The person's position, size, and appearance must remain 100% IDENTICAL to the original image.
Nothing about the person changes - ONLY the background changes.
- Face position: LOCKED (pixel-perfect same location)
- Face size: LOCKED
- Body position: LOCKED
- Body size: LOCKED
- Limbs position: LOCKED (arms, legs all stay in place)
- Overall person size: LOCKED (no zoom in/out)
- Horizontal position: LOCKED (no left/right shift)
- Vertical position: LOCKED (no up/down shift)
- Person's appearance: LOCKED (no changes whatsoever)

════════════════════════════════════════════════════════════════

🎯 OBJECTIVE:
Replace ONLY the background while keeping the person 100% unchanged and locked in position.
The person must look like they are in a different location, but the person themselves must be pixel-perfect identical.

════════════════════════════════════════════════════════════════

📥 INPUT ANALYSIS:
- Image 1: Person's portrait with original background (person will stay EXACTLY as-is)
- Image 2: Target background design (reference image for the new background)

════════════════════════════════════════════════════════════════

🔒 PROTECTED ELEMENTS - ABSOLUTELY DO NOT CHANGE:

PERSON - COMPLETE LOCK (ALL ASPECTS):
✓ Face position in frame (pixel-perfect)
✓ Face size (exact)
✓ All facial features (eyes, nose, mouth, cheeks, lips)
✓ Facial expression (exact same)
✓ Head position and angle (exact)
✓ Hair (color, style, position, length - unchanged)
✓ Skin tone (exact)
✓ Eyes (color, shine, expression)
✓ Eyebrows (shape, position)
✓ Lips (color, position, shape)

✓ Body position in frame (pixel-perfect)
✓ Body size (exact)
✓ Body angle and rotation
✓ Spine alignment
✓ Shoulder position and width
✓ Chest size
✓ Waist size
✓ Clothing (color, fit, details - exact)
✓ All fabric textures and patterns
✓ All buttons, seams, and embellishments

✓ Left arm position, size, angle (exact)
✓ Right arm position, size, angle (exact)
✓ Left hand position and details
✓ Right hand position and details
✓ Left leg position, size, angle
✓ Right leg position, size, angle
✓ Feet position and details

LIGHTING & APPEARANCE:
✓ Lighting direction on the person
✓ Shadows on the person
✓ Highlights on the person
✓ All facial shadows and light
✓ All body shadows and highlights

FRAMING & COMPOSITION:
✓ Aspect ratio (keep 3:4 portrait format)
✓ Person's distance from camera
✓ Person's position in frame (left/right)
✓ Person's position in frame (up/down)
✓ Overall person size as % of frame

═══════════════════��════════════════════════════════════════════

🎨 BACKGROUND ELEMENTS - WILL CHANGE:

✓ Everything BEHIND the person (background area)
✓ Everything OUTSIDE the person's silhouette
✓ Sky, ground, trees, buildings, etc. (background only)
✓ Background colors
✓ Background lighting
✓ Background textures and details

IMPORTANT: The background must be seamlessly blended where it meets the person's outline.

════════════════════════════════════════════════════════════════

⚙️ EXECUTION PROCESS (6 STEPS):

[STEP 1] ANALYSIS OF BACKGROUND REFERENCE:
Extract all details from the reference background image:
  - Primary colors and color palette
  - Overall mood and lighting (bright, dark, warm, cool)
  - Lighting direction and angle
  - Types of elements (sky, ground, trees, water, architecture, etc.)
  - Texture and surface properties
  - Depth and perspective
  - Lighting quality and shadows in the background
  - Atmosphere (time of day, weather, season)
  - Composition and focal points

[STEP 2] PERSON ANALYSIS & POSITIONING:
Lock the person's position - they will NOT move:
  - Face center location in pixel coordinates
  - Body center of mass position
  - Silhouette outline (the boundary between person and background)
  - Limb positions and angles
  - Lighting on the person (this will be preserved)
  This bounding box and all positions will NOT change whatsoever.

[STEP 3] BACKGROUND SEGMENTATION:
Identify what is background to replace:
  - Everything BEHIND the person (identify the background area)
  - Everything OUTSIDE the person's silhouette
  - Keep the person's outline precise
  - Mark all areas that will be replaced with new background

[STEP 4] BACKGROUND APPLICATION:
Apply the new background design:
  - Use the person's LOCKED position as the anchor
  - Apply reference background to fill the area behind/around the person
  - Match all extracted background colors
  - Render all background textures and details
  - Match the extracted lighting direction
  - Create appropriate shadows in the background
  - Match the atmosphere and mood from reference

[STEP 5] SEAMLESS BLENDING AT PERSON EDGES:
Blend the background naturally where it meets the person:
  - Background must blend smoothly at the person's silhouette edge
  - Hair edges: background must blend naturally with hair
  - Face edges: background must blend naturally with face
  - Body edges: background must blend naturally with body
  - Arm edges: background must blend with arms
  - Leg edges: background must blend with legs
  - Hands and feet edges: background must blend smoothly
  - No hard edges or visible seams at person boundary
  - Lighting on person must look consistent with background lighting direction

[STEP 6] FINAL INTEGRATION & QUALITY ASSURANCE:
Finalize and verify the composition:
  - Person is in exact same position (no shift, no zoom, no rotation)
  - Background blends naturally at all edges
  - Lighting is consistent (person's lighting matches background lighting direction)
  - Shadows are realistic and consistent
  - Person's appearance is 100% identical
  - Background is fully rendered with all details
  - Eliminate all artifacts, glitches, or unnatural elements
  - Result looks like a professional studio photo with background compositing

════════════════════════════════════════════════════════════════

✅ QUALITY CHECKLIST (MUST VERIFY BEFORE OUTPUT):

☑ PERSON INTEGRITY (MOST CRITICAL):
  ☑ Face is 100% identical to original (same features, expression, position)
  ☑ Body is 100% identical to original (same size, shape, position)
  ☑ Hair is 100% identical (same color, style, position, texture)
  ☑ Clothing is 100% identical (same color, fit, details, position)
  ☑ Limbs are 100% identical (same position, length, angle, posture)
  ☑ Person's position in frame is 100% identical (pixel-perfect)
  ☑ Person's size in frame is 100% identical
  ☑ Person's distance from camera is 100% identical
  ☑ NO shifting left/right/up/down
  ☑ NO zooming in/out
  ☑ NO rotating or tilting
  ☑ NO changing facial features or expression
  ☑ NO changing body shape or proportions
  ☑ All facial details are preserved (eyes, nose, mouth, skin texture)
  ☑ All body details are preserved (clothing, texture, color)

☑ BACKGROUND ACCURACY:
  ☑ All colors from reference background image are matched
  ☑ All textures from reference are preserved
  ☑ All background elements are rendered (sky, ground, objects, etc.)
  ☑ Lighting direction matches the reference background
  ☑ Shadows in background are realistic
  ☑ Atmosphere and mood match the reference
  ☑ Depth and perspective look natural
  ☑ All details from reference are visible and clear

☑ SEAMLESS BLENDING:
  ☑ Background blends smoothly where it meets the person's silhouette
  ☑ Hair-to-background transition is seamless
  ☑ Face-to-background transition is seamless
  ☑ Body-to-background transition is seamless
  ☑ Arms-to-background transition is seamless
  ☑ Legs-to-background transition is seamless
  ☑ Hands/feet-to-background transition is seamless
  ☑ No visible seams or hard edges at person boundary
  ☑ No halos or artifacts around the person
  ☑ Person's lighting is consistent with background

☑ NATURAL APPEARANCE:
  ☑ Result looks photorealistic and professional
  ☑ Person looks like they belong in the new background
  ☑ Lighting on person is consistent with background lighting
  ☑ Shadows are realistic and consistent
  ☑ No visual artifacts or glitches
  ☑ No color shifts or color bleeding
  ☑ Result looks like a professionally composited image

═══════════════════════════════════════════��════════════════════

❌ ABSOLUTE PROHIBITIONS (NEVER DO THESE):

PERSON CHANGES - STRICTLY FORBIDDEN:
  ❌ Do NOT change the person's face in any way
  ❌ Do NOT alter any facial features (eyes, nose, mouth, cheeks)
  ❌ Do NOT change facial expression or emotion
  ❌ Do NOT alter the person's head position or angle
  ❌ Do NOT change hair color, style, or position
  ❌ Do NOT change skin tone or texture
  ❌ Do NOT alter the person's body structure or shape
  ❌ Do NOT change the person's pose or posture
  ❌ Do NOT modify clothing color, fit, or details
  ❌ Do NOT change limb positions or angles
  ❌ Do NOT change hand or feet positions

POSITION CHANGES - STRICTLY FORBIDDEN:
  ❌ Do NOT move the person left, right, up, or down
  ❌ Do NOT zoom in or out on the person
  ❌ Do NOT rotate or tilt the person
  ❌ Do NOT shift the person's distance from camera
  ❌ Do NOT change the aspect ratio
  ❌ Do NOT crop the person differently

QUALITY ISSUES - STRICTLY FORBIDDEN:
  ❌ Do NOT reduce quality of person's appearance
  ❌ Do NOT blur or soften the person
  ❌ Do NOT reduce resolution or sharpness of the person
  ❌ Do NOT wash out colors on the person
  ❌ Do NOT create color shifts on the person
  ❌ Do NOT add artificial effects to the person
  ❌ Do NOT create halos or glows around the person
  ❌ Do NOT create hard edges around the person
  ❌ Do NOT leave seams or visible transitions at person boundary

════════════════════════════════════════════════════════════════

📤 OUTPUT REQUIREMENTS:

- Format: High-resolution image
- Aspect ratio: 3:4 (portrait orientation) - KEEP IDENTICAL TO ORIGINAL
- Quality: Photorealistic, studio-level professional
- Person position: IDENTICAL to original (pixel-perfect)
- Person appearance: IDENTICAL to original (100%)
- Background: Complete replacement with reference design
- Blending: Seamless at all person edges
- Result: Looks like a professional studio photo with background replacement

════════════════════════════════════════════════════════════════

Proceed with absolute precision. The person must remain unchanged in every way.
Only the background changes. This is non-negotiable.
`;

    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64(base64Image),
              },
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: bgBase64,
              },
            },
          ],
        },
        config: {
          temperature: 0.0,
          imageConfig: {
            aspectRatio: "3:4",
          },
        },
      });
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ 背景合成完了（Gemini）');
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("画像が生成されませんでした。別の写真をお試しください。");

  } catch (error: any) {
    console.error("背景合成エラー:", error);
    throw new Error(`背景の合成に失敗しました: ${error.message}`);
  }
};

/**
 * 服装合成：ユーザー画像 + public 服装画像を Gemini で合成
 */
export const applyClothingSynthesis = async (
  base64Image: string,
  option: ClothingOption,
): Promise<string> => {
  try {
    if (option === ClothingOption.None) return base64Image;

    console.log('🤖 服装合成を開始:', option);

    // public 服装画像を取得
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
    console.log('🔄 Gemini で合成中...');

    // Gemini SDK で直接合成
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


const prompt = `
🔴 [最重要：人物は絶対に動かさない・大きさを変えない]

You are a world-class professional image composition engineer specializing in photorealistic clothing synthesis.

MOST CRITICAL INSTRUCTION:
The person's position and size must remain 100% IDENTICAL to the original image.
- Face position: LOCKED (pixel-perfect same location)
- Body position: LOCKED
- Limbs position: LOCKED (arms, legs all stay in place)
- Overall person size: LOCKED (no zoom in/out)
- Horizontal position: LOCKED (no left/right shift)
- Vertical position: LOCKED (no up/down shift)

════════════════════════════════════════════════════════════════

🎯 OBJECTIVE:
Replace only the person's clothing while keeping the person 100% unchanged and locked in position.

════════════════════════════════════════════════════════════════

📥 INPUT ANALYSIS:
- Image 1: Person's portrait (with current clothing - will be replaced)
- Image 2: Target clothing design (reference image for the new outfit)

════════════════════════════════════════════════════════════════

🔒 PROTECTED ELEMENTS (ABSOLUTELY DO NOT CHANGE):

FACE & HEAD:
✓ Face position in frame
✓ Face size and proportions
✓ Facial features (eyes, nose, mouth, cheeks)
✓ Facial expression
✓ Head position and angle
✓ Hair (color, style, position, length)
✓ Skin tone

BODY:
✓ Torso position in frame
✓ Torso size
✓ Body angle and rotation
✓ Spine alignment
✓ Shoulder position and width
✓ Chest and waist size
✓ Body contours

LIMBS:
✓ Left arm position, size, angle
✓ Right arm position, size, angle
✓ Left leg position, size, angle
✓ Right leg position, size, angle
✓ All joint positions

FRAME & COMPOSITION:
✓ Person's distance from camera (no zoom in/out)
✓ Person's position in frame (left/right/up/down)
✓ Aspect ratio (keep 3:4 portrait format)
✓ Overall person size as % of frame

════════════════════════════════════════════════════════════════

⚙️ EXECUTION PROCESS (5 STEPS):

[STEP 1] ANALYSIS OF CLOTHING REFERENCE:
Extract all details from the reference clothing image:
  - Primary colors and secondary colors (RGB accuracy)
  - Material type (silk = lustrous, cotton = matte, etc.)
  - Texture and surface properties
  - All patterns, prints, designs
  - All structural elements (collar style, sleeve type, closure type)
  - All decorative elements (buttons, seams, embroidery, crests, trim)
  - Overall fit and style
  - Fabric sheen and light reflection properties

[STEP 2] PERSON ANALYSIS & POSITIONING:
Lock the person's position and identify key anatomical points:
  - Bounding box: head to toe, left shoulder to right shoulder
  - Face center location in pixel coordinates
  - Body center of mass position
  - Limb positions and angles
  - Clothing area to be replaced
  This bounding box and all positions will NOT change.

[STEP 3] CLOTHING REMOVAL:
Remove the existing clothing completely:
  - Erase all garment areas
  - Maintain underlying body contours under removed clothing
  - Preserve anatomically correct skin tone where clothing was
  - Keep the person in the EXACT same position (no shift, no zoom)
  - Do NOT move the person to create space for new clothing

[STEP 4] NEW CLOTHING APPLICATION:
Apply the new clothing design:
  - Use the person's LOCKED position as the anchor point
  - Apply reference clothing design to fit the person's body (NOT vice versa)
  - Match all extracted colors exactly (use reference RGB values)
  - Render all extracted textures and patterns
  - Include all structural elements (collar, sleeves, closures)
  - Include all decorative elements (buttons, seams, embroidery)
  - Add natural wrinkles and fabric folds following body contours
  - Ensure clothing looks naturally fitted (not loose, not tight)
  - Add appropriate sheen based on fabric type

[STEP 5] INTEGRATION & QUALITY ASSURANCE:
Finalize and verify the composition:
  - Blend clothing seamlessly at all boundaries:
    * Neck area to clothing collar
    * Sleeves to arms/wrists
    * Bottom edge to legs/torso
    * All edges must look natural
  - Match lighting and shadows from original portrait
  - Ensure consistent lighting direction
  - Create realistic shadows where clothing meets body
  - Verify body contours are visible through clothing shading
  - Eliminate all artifacts, glitches, or unnatural elements

════════════════════════════════════════════════════════════════

✅ QUALITY CHECKLIST (MUST VERIFY BEFORE OUTPUT):

☑ PERSON INTEGRITY:
  ☑ Face is 100% identical to original (same features, expression)
  ☑ Body is 100% identical to original (same proportions, shape)
  ☑ Hair is 100% identical (same color, style, position)
  ☑ Limbs are 100% identical (same position, length, angle)
  ☑ Person's position in frame is 100% identical
  ☑ Person's size in frame is 100% identical
  ☑ NO shifting left/right/up/down
  ☑ NO zooming in/out
  ☑ NO rotating or tilting

☑ CLOTHING ACCURACY:
  ☑ All colors from reference image are matched exactly
  ☑ All textures from reference are preserved
  ☑ All patterns from reference are rendered
  ☑ All buttons are visible and accurately placed
  ☑ All seams are visible and sharp
  ☑ All decorative elements from reference are included
  ☑ White and light colors maintain full contrast (no washing out)
  ☑ Fabric type properties are reflected (matte vs glossy)
  ☑ Embroidery and detailed stitching are rendered
  ☑ Cultural elements (for kimono: crests, collar details) are preserved

☑ NATURAL APPEARANCE:
  ☑ Clothing fits the person's body naturally
  ☑ Wrinkles and folds follow body contours
  ☑ No floating fabric or unnatural positioning
  ☑ Blending at all boundaries is seamless
  ☑ Lighting is consistent with original
  ☑ Shadows are realistic
  ☑ No artifacts, glitches, or visual errors
  ☑ Result looks photorealistic and professional

════════════════════════════════════════════════════════════════

❌ ABSOLUTE PROHIBITIONS (NEVER DO THESE):

  ❌ Do NOT change the person's face in any way
  ❌ Do NOT alter the person's body structure
  ❌ Do NOT modify the person's pose or position
  ❌ Do NOT move the person left, right, up, or down
  ❌ Do NOT zoom in or out on the person
  ❌ Do NOT rotate or tilt the person
  ❌ Do NOT resize the person (make bigger or smaller)
  ❌ Do NOT shift the person horizontally or vertically
  ❌ Do NOT change the aspect ratio
  ❌ Do NOT preserve any old clothing
  ❌ Do NOT leave old clothing visible
  ❌ Do NOT blend old and new clothing together
  ❌ Do NOT reduce quality of clothing details
  ❌ Do NOT blur or soften the clothing textures
  ❌ Do NOT wash out colors, especially white/light areas
  ❌ Do NOT create color shifts or color degradation
  ❌ Do NOT reduce contrast in the reference clothing
  ❌ Do NOT eliminate patterns or textures
  ❌ Do NOT remove buttons, seams, or structural details
  ❌ Do NOT create unnatural fitting or floating clothing
  ❌ Do NOT change the material appearance
  ❌ Do NOT add artificial effects or distortions
  ❌ Do NOT reduce resolution or sharpness
  ❌ Do NOT over-smooth details
  ❌ Do NOT create inconsistent lighting
  ❌ Do NOT remove decorative elements or embroidery
  ❌ Do NOT enlarge clothing to show more details
  ❌ Do NOT make clothing loose or oversized to fit

════════════════════════════════════════════════════════════════

📤 OUTPUT REQUIREMENTS:

- Format: High-resolution image
- Aspect ratio: 3:4 (portrait orientation) - KEEP IDENTICAL TO ORIGINAL
- Quality: Photorealistic, studio-level professional
- Person position: IDENTICAL to original (pixel-perfect)
- Person size: IDENTICAL to original
- All details: Sharp, clear, visible
- Result: Looks like a professional studio photo with a wardrobe change

════════════════════════════════════════════════════════════════

Proceed with absolute precision. The person's position and size are sacred - they must not change.
`;


    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64(base64Image),
              },
            },
            {
              inlineData: {
                mimeType: 'image/jpg',
                data: clothingBase64,
              },
            },
          ],
        },
        config: {
          temperature: 0.0,
          imageConfig: {
            aspectRatio: "3:4",
          },
        },
      });
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ 服装合成完了（Gemini）');
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("画像が生成されませんでした。別の写真をお試しください。");

  } catch (error: any) {
    console.error("服装合成エラー:", error);
    throw new Error(`服装の合成に失敗しました: ${error.message}`);
  }
};

/**
 * HEIC 修復：HEIC を JPEG に変換
 */
export const repairHeicImage = async (base64Heic: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: "[ROLE: RESTORATION EXPERT] Convert this HEIC image to a high-quality JPEG. ELIMINATE all noise/grain. Sharpen details." },
        { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }
      ]
    },
    config: {
      temperature: 0.0,
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Repair failed");
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
};
