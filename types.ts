
export enum AppState {
  LOGIN = 'LOGIN',
  UPLOAD = 'UPLOAD',
  CROPPING = 'CROPPING',
  EDITING = 'EDITING',
  RESULT = 'RESULT',
}

export enum EditAction {
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
