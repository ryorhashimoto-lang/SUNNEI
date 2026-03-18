/**
 * 背景画像データを管理するファイル
 * BackgroundOption（背景の種類）と画像のURLをマッピング
 */

import { BackgroundOption } from '../types';

export const BACKGROUND_IMAGES: Record<string, string> = {
  [BackgroundOption.SoftBlue]: '/backgrounds/soft_blue.png',
  [BackgroundOption.SoftPink]: '/backgrounds/soft_pink.png',
  [BackgroundOption.WisteriaPurple]: '/backgrounds/wisteria_purple.png',
  [BackgroundOption.FreshGreen]: '/backgrounds/fresh_green.png',
  [BackgroundOption.WhiteGrey]: '/backgrounds/white_grey.png',
  [BackgroundOption.Sky]: '/backgrounds/sky.png',
  [BackgroundOption.Sea]: '/backgrounds/sea.png',
  [BackgroundOption.CherryBlossom]: '/backgrounds/cherry_blossom.png',
  [BackgroundOption.FreshNewGreen]: '/backgrounds/fresh_new_green.png',
};

/**
 * 指定された背景オプションの画像URLを取得
 */
export const getBackgroundImage = (option: BackgroundOption): string => {
  return BACKGROUND_IMAGES[option] || '';
};
