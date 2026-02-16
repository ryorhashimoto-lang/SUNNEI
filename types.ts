
export enum AppState {
  LOGIN = 'LOGIN',
  UPLOAD = 'UPLOAD',
  CROPPING = 'CROPPING',
  EDITING = 'EDITING',
  RESULT = 'RESULT',
}

export enum EditAction {
  REMOVE_BG_BLUE = 'REMOVE_BG_BLUE',
  REMOVE_BG_GRAY = 'REMOVE_BG_GRAY',
  REMOVE_BG_PINK = 'REMOVE_BG_PINK',
  REMOVE_BG_YELLOW = 'REMOVE_BG_YELLOW',
  REMOVE_BG_PURPLE = 'REMOVE_BG_PURPLE',
  REMOVE_BG_WHITE = 'REMOVE_BG_WHITE',
  SUIT_MENS = 'SUIT_MENS',
  SUIT_WOMENS = 'SUIT_WOMENS',
  KIMONO_MENS = 'KIMONO_MENS',
  KIMONO_WOMENS = 'KIMONO_WOMENS',
  MANUAL_EDIT = 'MANUAL_EDIT',
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

export type FrameType = 'none' | 'black_gold' | 'pearl' | 'wood';

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
}

export interface ImageState {
  original: string | null;
  current: string | null;
  history: string[];
}
