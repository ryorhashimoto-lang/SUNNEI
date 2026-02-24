
export enum AppState {
  LOGIN = 'LOGIN',
  UPLOAD = 'UPLOAD',
  CROPPING = 'CROPPING',
  EDITING = 'EDITING',
  RESULT = 'RESULT',
}

export enum ClothingOption {
  None = 'none',
  MensSuitBlack = 'mens_suit_black',
  MensKimono = 'mens_kimono',
  WomensSuitBlack = 'womens_suit_black',
  WomensKimonoBlack = 'womens_kimono_black',
}

export enum BackgroundOption {
  None = 'none',
  SoftBlue = 'soft_blue',
  SoftPink = 'soft_pink',
  WisteriaPurple = 'wisteria_purple',
  FreshGreen = 'fresh_green',
  WhiteGrey = 'white_grey',
}

export enum UserPlan {
  LITE = 'ライト',
  STANDARD = 'スタンダード',
  ENTERPRISE = 'エンタープライズ',
}

export interface CompanyInfo {
  id: string;
  name: string;
  plan: UserPlan;
}

export const PLAN_LIMITS: Record<UserPlan, number> = {
  [UserPlan.LITE]: 60,
  [UserPlan.STANDARD]: 200,
  [UserPlan.ENTERPRISE]: Infinity,
};

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
}

export interface CropConfig {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}
