/**
 * 着せ替え画像データを管理するファイル
 * ClothingOption（着せ替えの種類）と画像のURLをマッピング
 */

import { ClothingOption } from '../types';

export const CLOTHING_IMAGES: Record<string, string> = {
  [ClothingOption.MensSuitBlack]: '/clothing/mens_suit_black.jpg',
  [ClothingOption.MensKimonoBlack]: '/clothing/mens_kimono_black.jpg',
  [ClothingOption.WomensSuitBlack]: '/clothing/womens_suit_black.jpg',
  [ClothingOption.WomensKimonoBlack]: '/clothing/womens_kimono_black.jpg',
};

/**
 * 指定された着せ替えオプションの画像URLを取得
 */
export const getClothingImage = (option: ClothingOption): string => {
  return CLOTHING_IMAGES[option] || '';
};
