
import { GoogleGenAI } from "@google/genai";
import { ClothingOption, BackgroundOption } from "../types";

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  return dataUrl.split(',')[1];
};

/**
 * Prompt generation logic based on the "Stable Version"
 */
const getPrompts = (clothing: ClothingOption, background: BackgroundOption) => {
  let clothingPrompt = "";
  // Enhanced descriptions for Material Physics (Super Black / High Quality) and Cultural Accuracy
  switch (clothing) {
    case ClothingOption.None:
      clothingPrompt = "";
      break;
    
    // Men
    case ClothingOption.MensSuitBlack:
      // Added: Mourning tie rules (Matte, Plain knot, No dimple)
      clothingPrompt = "a premium formal black mourning suit (Super Black matte wool, approx 300gsm weight). White shirt. Tie: Solid matte black silk mourning tie, plain knot (or Windsor), NO fashion dimples, strict solemn style. The lapel has a soft 'roll' indicating high-quality tailoring.";
      break;
    case ClothingOption.MensKimono:
      // Added: Kimono Structure (Habutae) and Crests
      clothingPrompt = "a formal black Japanese Montsuki Haori Hakama kimono with 5 family crests (kamon). Material: High-quality Habutae silk (smooth, matte sheen). Masculine, dignified structure. Himo (cords) are white.";
      break;

    // Women
    case ClothingOption.WomensSuitBlack:
      // Added: Pearl necklace specification and fabric texture
      clothingPrompt = "a women's high-quality formal black mourning ensemble (matte black jacket and dress, non-shiny deep black fabric). Accessories: A single strand of white pearls (matte luster). Modest, feminine tailored fit, high neckline.";
      break;
    case ClothingOption.WomensKimonoBlack:
      // Added: Mofuku texture
      clothingPrompt = "a formal black Japanese Mofuku kimono (mourning kimono). Deep matte black silk (Chirimen or Habutae) with 5 family crests. Obi is black with subtle patterns. Feminine and elegant.";
      break;
  }

  let backgroundPrompt = "";
  // Added descriptive keywords for ultra-smoothness and professional quality
  const qualitySuffix = "perfectly smooth professional studio gradient, uniform texture, no noise, no artifacts, clean high-end photographic finish";
  
  switch (background) {
    case BackgroundOption.None:
      backgroundPrompt = "Keep the background exactly as it is.";
      break;
    case BackgroundOption.SoftBlue:
      backgroundPrompt = `a soft, light blue ${qualitySuffix}`;
      break;
    case BackgroundOption.SoftPink:
      backgroundPrompt = `a gentle, warm pale pink ${qualitySuffix}`;
      break;
    case BackgroundOption.WisteriaPurple:
      backgroundPrompt = `a dignified, soft wisteria purple (traditional Japanese Fujiiro) ${qualitySuffix}`;
      break;
    case BackgroundOption.FreshGreen:
      backgroundPrompt = `a fresh, calming pale green (Wakakusairo) ${qualitySuffix}`;
      break;
    case BackgroundOption.WhiteGrey:
      backgroundPrompt = `a bright, clean white-grey ${qualitySuffix}`;
      break;
  }

  return { clothingPrompt, backgroundPrompt };
};

// Retry helper function
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for transient errors (500 series or network issues)
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
 * Core generation logic strictly following the "Stable Version" structure
 */
const generatePortrait = async (
  imageBase64: string,
  clothing: ClothingOption,
  background: BackgroundOption
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { clothingPrompt, backgroundPrompt } = getPrompts(clothing, background);

  // === Chain of Thought Instruction Construction ===
  const instructionList: string[] = [];

  // [Phase 1: Planning & Analysis]
  instructionList.push("STEP 0 [ANALYSIS]: Analyze the original image's lighting angle (key light), shadow hardness, and color temperature. Plan the clothing generation to match this EXACT lighting environment.");
  
  // LIGHTING STYLE
  instructionList.push("LIGHTING STYLE: Japanese Memorial Portrait style. Ensure the face is evenly lit. If the original photo has harsh shadows, apply a subtle 'fill light' to the clothing to maintain a gentle, peaceful atmosphere. Avoid high-contrast dramatic noir lighting.");

  // ORIENTATION ANALYSIS
  instructionList.push("STEP 0.5 [ORIENTATION ANALYSIS]: Analyze the subject's Head Pose (Yaw, Pitch, Roll).");
  instructionList.push("  - YAW (Turn): Is the subject looking straight or to the side?");
  instructionList.push("  - PITCH (Tilt): Is the camera looking up at them (Low Angle) or down (High Angle)?");

  // [UPDATED] CAMERA SETTINGS (Lens & Aperture)
  // 焦点距離の指定：広角歪みを防ぎ、プロのポートレートの風格を出す
  instructionList.push("CAMERA SETTINGS 1 (Lens): Focal Length 85mm to 105mm (Medium Telephoto). This is critical to flatten facial distortion and provide a dignified, professional look. Do NOT use wide-angle (24mm/35mm) perspective.");
  // 被写界深度の指定：顔から肩までピントを合わせる
  instructionList.push("CAMERA SETTINGS 2 (Aperture): f/8 or f/11 (Deep Depth of Field). Focus must be sharp on BOTH the face AND the chest/shoulders. Do NOT apply bokeh/blur to the clothing. Only the background should be out of focus. This is a formal portrait, not an artistic snapshot.");

  // [Phase 2: Background (The Canvas)]
  if (background !== BackgroundOption.None) {
    instructionList.push(`STEP 1 [BACKGROUND]: Change the background to ${backgroundPrompt}.`);
    instructionList.push("The background must be a flawless, smooth gradient with professional studio lighting. No noise, no banding.");
  } else {
    instructionList.push(`STEP 1 [BACKGROUND]: Keep the background exactly as it is. Do NOT change the background.`);
  }

  // [Phase 3: Clothing & Anatomy (The Structure)]
  if (clothing !== ClothingOption.None) {
    instructionList.push(`STEP 2 [CLOTHING]: Change the person's clothing to ${clothingPrompt}.`);
    
    // [NEW] CULTURAL RULE: Kimono Crossing
    if (clothing === ClothingOption.MensKimono || clothing === ClothingOption.WomensKimonoBlack) {
        instructionList.push("CULTURAL RULE [CRITICAL]: Kimono Collar Crossing (Eri-awase).");
        instructionList.push("  - The Left collar panel must cross OVER the Right collar panel.");
        instructionList.push("  - Visual Shape: Look for a lowercase 'y' shape on the chest.");
        instructionList.push("  - Do NOT generate 'Right over Left' (Dead person style) unless explicitly requested. Use standard formal 'Left over Right'.");
    }

    // Module: Anatomy (骨格・解剖学)
    instructionList.push("ANATOMY RULE 1 (Muscles): Render the 'sternocleidomastoid muscles' faintly visible on the neck to indicate realistic head rotation and tension. Do not make the neck a simple cylinder.");
    
    instructionList.push("ANATOMY RULE 1.5 (Midline & Yaw): If the subject's head is turned (Yaw), do NOT place the tie knot/kimono center directly under the chin. It must align with the 'Suprasternal Notch' (base of neck).");
    
    instructionList.push("ANATOMY RULE 2 (Clavicles): The collar of the clothing must sit with weight upon the 'clavicles' (collarbones). Ensure there is a gap/shadow between the neck and the back of the collar to show depth.");
    
    instructionList.push("ANATOMY RULE 2.5 (Perspective & Pitch): Adjust collar curvature based on camera angle.");
    instructionList.push("  - LOW ANGLE (Looking up): The back of the collar should curve UPWARDS around the neck. The shoulders appear lower.");
    instructionList.push("  - HIGH ANGLE (Looking down): The back of the collar should curve DOWNWARDS. The shoulders appear higher and flatter.");
    
    instructionList.push("ANATOMY RULE 3 (Trapezius): Calculate the slope of the 'trapezius muscles' based on the subject's age. Older subjects should have slightly more rounded shoulders, not stiff square shoulders.");
    
    // ANATOMY PROPORTION
    instructionList.push("ANATOMY PROPORTION: Strictly maintain realistic head-to-shoulder ratios. Do not elongate the neck like a fashion model. The trap muscles (shoulders) should start at a biologically accurate height relative to the chin.");
    
    // [NEW] NECK AGING
    instructionList.push("NECK AGE MATCHING: The thickness and skin texture of the neck MUST match the age of the face.");
    instructionList.push("  - If the face is elderly, the neck must show appropriate slackness, cords, and width. Do not put a young, thick neck on an elderly face.");

    // Module: Lighting Physics (光と影)
    instructionList.push("LIGHTING RULE 1 (Occlusion): Apply deep 'ambient occlusion shadows' directly under the chin and jawline where the head meets the neck/collar. This area must be the darkest point to anchor the head.");
    instructionList.push("LIGHTING RULE 2 (Bounce): Calculate 'bounce light' from the clothing onto the jawline. If the clothes are black, the underside of the jaw should reflect less light (negative fill).");
    instructionList.push("LIGHTING RULE 3 (Tone): Match the white balance of the clothing to the skin tones.");
    // [NEW] Lighting Rule 4 - Hair Separation (黒髪と黒背景の分離)
    instructionList.push("LIGHTING RULE 4 (Hair Separation): Apply a subtle 'Kicker Light' (Rim Light) to the top and sides of the hair. This is MANDATORY to separate dark hair from the dark background/suit. The hair silhouette must be clearly defined against the background.");

    // Module: Materiality (衣服の質感)
    instructionList.push("MATERIAL RULE 1 (Weight): Simulate the physics of heavyweight fabric (approx. 300gsm for suits). The fabric should drape stiffly and not cling to the body like thin cotton.");
    instructionList.push("MATERIAL RULE 2 (Texture): Render 'high-frequency noise' on black fabric to represent the weave of the thread. Avoid a flat, solid black fill.");
    
    // [ENHANCED] Black Rendering Logic
    if (clothing === ClothingOption.MensSuitBlack || clothing === ClothingOption.WomensSuitBlack || clothing === ClothingOption.MensKimono || clothing === ClothingOption.WomensKimonoBlack) {
      instructionList.push("MATERIAL RULE 3 (Super Black): The fabric must be 'Super Black' formal wool/silk with a matte finish. No shiny polyester reflection.");
      instructionList.push("MATERIAL RULE 4 (Edge Definition): To prevent the black suit from looking like a flat silhouette, add subtle 'Rim Light' or 'Edge Specularity' to the shoulders and lapel edges to separate the black clothing from the background.");
      instructionList.push("MATERIAL RULE 5 (Black Values): Ensure the black area has a dynamic range (e.g., #0f0f0f to #252525) to show fold details, rather than flat #000000.");
    }

    // IMPERFECTION LOGIC (Realism)
    instructionList.push("IMPERFECTION LOGIC: Introduce very subtle 'micro-folds' around the shoulders and lapels to suggest gravity and the physical presence of a body inside the suit. Do not make the suit look like a rigid 3D render.");
    
    // Module: Neck Color Integration (Compositing Logic)
    instructionList.push("NECK INTEGRATION RULE: Sample the average HEX color code from the subject's cheek. Apply this EXACT color palette to the newly generated neck area to ensure zero color difference.");

    // NECK TEXTURE RULE
    instructionList.push("NECK TEXTURE RULE: Do NOT render the neck with smooth plastic skin. Apply 'senile skin texture' (fine wrinkles, pores) to the neck area that matches the age of the subject's face. The transition from jaw to neck must have 'subsurface scattering' to look organic.");

  } else {
    instructionList.push(`STEP 2 [CLOTHING]: Keep the person's clothing exactly as it is.`);
  }

  // [Phase 4: Absolute Identity Protection (Defense-Specialized)]
  instructionList.push("STEP 3 [FACE LOCK - CRITICAL]: The face area is SACRED.");
  
  instructionList.push("RULE 1 [TOPOLOGY LOCK]: Treat facial landmarks (eyes, nose, mouth, jawline) as **FIXED GEOMETRY**. Do not move pixels. Do not warp features. Do not re-mesh the face.");
  instructionList.push("RULE 2 [BIOMETRIC FIDELITY]: The output image must pass a **biometric face recognition test** against the input image. If the eye distance or nose width changes by even 1 pixel, the generation is a failure.");
  
  instructionList.push("RULE 3 [SKIN HISTORY]: Treat wrinkles, age spots, and moles as **'Essential Identity Markers'**. Do NOT apply 'beauty filters'. Do NOT apply 'denoising' to skin texture. These are the client's history.");
  instructionList.push("RULE 4 [FORENSIC ACCURACY]: Maintain the exact depth of the nasolabial folds (laugh lines) and the exact volume of the eye bags. Altering these features changes the perceived age and identity.");

  // [Phase 5: Compositing Logic]
  instructionList.push("STEP 4 [COMPOSITING LOGIC]: Only generate pixels for the **Clothing** and **Background** regions. For the Face region, perform a **'Texture Projection'** of the original image to ensure 100% fidelity.");
  
  // [NEW] Texture & Blending Rules (ISO Matching & Feathering)
  instructionList.push("COMPOSITING RULE 1 (ISO Matching): Analyze the 'Film Grain' / 'ISO Noise' level of the original face image. Apply the EXACT SAME amount of monochromatic noise to the generated clothing and background. Do not generate a 'clean digital' image if the source is a scanned film photo. The image must look consistent.");
  instructionList.push("COMPOSITING RULE 2 (Seam Blending): When merging the original face with the new neck/body, do not use a hard cut. Apply 'Subsurface Scattering' simulation at the jawline transition. The shadow under the chin must blend softly into the neck (Feathering).");

  // [Phase 6: Negative Constraints]
  instructionList.push("NEGATIVE CONSTRAINTS: NO de-aging (Respect the dignity of age). NO emotion shift (Do not add a smile). NO 'AI GLOSS' (Skin must look organic). NO style transfer. NO oil painting style.");

  const prompt = `
    Role: You are a master professional retoucher (Compositor) specializing in Japanese memorial portraits (Iei).
    Task: Composite new attire onto the subject while preserving the facial identity with 100% accuracy.

    EXECUTION PLAN:
    ${instructionList.join('\n')}
  `;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64(imageBase64),
              },
            },
          ],
        },
        config: {
          temperature: 0.2, // Low temperature for precision
          imageConfig: {
             aspectRatio: "3:4" 
          }
        }
      });
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("画像が生成されませんでした。別の写真をお試しください。");

  } catch (error: any) {
    console.error("Gemini API Error:", JSON.stringify(error, null, 2));

    let errorMessage = error.message || "不明なエラーが発生しました";
    let errorCode = error.status || error.code;
    
    if (error.error) {
      errorMessage = error.error.message || errorMessage;
      errorCode = error.error.code || errorCode;
    }

    if (errorCode === 429 || errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("【利用制限】本日のAI生成回数の上限、または短時間のアクセス上限に達しました。しばらく時間を置いてから再度お試しください。");
    }

    if (errorCode === 500 || errorCode === 503 || errorMessage.includes("500") || errorMessage.includes("Rpc failed")) {
      throw new Error("【サーバー混雑】現在AIサーバーが混み合っています。数分待ってから再度お試しください。");
    }
    
    if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
      throw new Error("【安全フィルター】生成された画像が安全フィルターに引っかかりました。別の写真でお試しください。");
    }

    throw new Error(`AI生成エラー: ${errorMessage}`);
  }
};

// ==========================================================
// EXPORTED FUNCTIONS COMPATIBLE WITH CURRENT UI
// ==========================================================

export const applyBackgroundSynthesis = async (base64Image: string, option: BackgroundOption): Promise<string> => {
  // Use generatePortrait but keep clothing as is (ClothingOption.None)
  return generatePortrait(base64Image, ClothingOption.None, option);
};

export const applyClothingSynthesis = async (base64Image: string, option: ClothingOption): Promise<string> => {
  // Use generatePortrait but keep background as is (BackgroundOption.None)
  return generatePortrait(base64Image, option, BackgroundOption.None);
};

export const repairHeicImage = async (base64Heic: string): Promise<string> => {
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
          temperature: 0.2,
        }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Repair failed");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
};
