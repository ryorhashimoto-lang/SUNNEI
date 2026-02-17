
import React, { useState } from 'react';
import { ClothingOption, BackgroundOption, UserPlan, PLAN_LIMITS } from '../types';

interface ActionPanelProps {
  onBgAction: (option: BackgroundOption) => void;
  onClothingAction: (option: ClothingOption) => void;
  disabled: boolean;
  onDownload: () => void;
  onReset: () => void;
  onStartCrop: () => void;
  appliedBg: BackgroundOption;
  appliedClothing: ClothingOption;
  userPlan: UserPlan;
  usageCount: number;
  deceasedName: string;
  onDeceasedNameChange: (name: string) => void;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ 
  onBgAction,
  onClothingAction,
  disabled, 
  onDownload, 
  onReset, 
  onStartCrop,
  appliedBg,
  appliedClothing,
  userPlan,
  usageCount,
  deceasedName,
  onDeceasedNameChange
}) => {
  const [gender, setGender] = useState<'men' | 'women'>('men');

  const limit = PLAN_LIMITS[userPlan];
  const remaining = limit === Infinity ? '無制限' : Math.max(0, limit - usageCount);

  const menOptions = [
    { id: ClothingOption.MensSuitBlack, label: '黒礼服', desc: '格式高い葬儀・法要向け' },
    { id: ClothingOption.MensKimono, label: '黒紋付', desc: '最も格式高い和装' },
    { id: ClothingOption.MensSuitNavy, label: 'ネイビースーツ', desc: '落ち着いた印象' },
  ];

  const womenOptions = [
    { id: ClothingOption.WomensSuitBlack, label: '黒フォーマル', desc: 'アンサンブル（パール付）' },
    { id: ClothingOption.WomensKimonoBlack, label: '黒喪服', desc: '格式高い和装喪服' },
    { id: ClothingOption.WomensKimonoColor, label: '色無地/訪問着', desc: '上品な淡い色合い' },
  ];

  const currentClothingOptions = gender === 'men' ? menOptions : womenOptions;

  const bgItems = [
    { id: BackgroundOption.SoftBlue, label: '淡いブルー', color: 'bg-blue-100' },
    { id: BackgroundOption.SoftPink, label: '淡いピンク', color: 'bg-pink-100' },
    { id: BackgroundOption.WisteriaPurple, label: '藤色', color: 'bg-purple-200' },
    { id: BackgroundOption.FreshGreen, label: '若草色', color: 'bg-green-100' },
    { id: BackgroundOption.WarmBeige, label: 'ベージュ', color: 'bg-orange-100' },
    { id: BackgroundOption.WhiteGrey, label: '明るいグレー', color: 'bg-gray-100' },
    { id: BackgroundOption.CloudyGrey, label: '雲模様', color: 'bg-stone-300' },
    { id: BackgroundOption.Floral, label: '菊の背景', color: 'bg-yellow-50' },
    { id: BackgroundOption.SolidBlack, label: '黒背景', color: 'bg-black' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-y-auto font-sans">
      
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-800 transition-colors text-sm font-bold group"
        >
          <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
          </div>
          戻る
        </button>

        <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-right">
          <p className="text-[10px] text-gray-400 font-sans tracking-widest uppercase mb-0.5 leading-none">{userPlan}プラン</p>
          <p className="text-[12px] font-sans font-bold text-gray-700 leading-none">
            残り: {remaining}{typeof remaining === 'number' && '枚'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        
        {/* Deceased Name */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
          <h3 className="font-bold text-blue-800 text-xs">故人様のお名前</h3>
          <input 
            type="text" 
            value={deceasedName}
            onChange={(e) => onDeceasedNameChange(e.target.value)}
            placeholder="ファイル名に反映"
            className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none font-bold"
          />
        </div>

        {/* Clothing Selection */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">服装の設定</h3>
          
          <div className="flex mb-3 bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => setGender('men')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${gender === 'men' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
            >
              男性用
            </button>
            <button
              onClick={() => setGender('women')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${gender === 'women' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
            >
              女性用
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onClothingAction(ClothingOption.None)}
              className={`p-3 rounded-lg border text-left transition-all ${appliedClothing === ClothingOption.None ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:bg-gray-50'}`}
            >
              <div className="font-bold text-xs text-gray-700">そのまま (加工なし)</div>
            </button>
            {currentClothingOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onClothingAction(opt.id)}
                className={`p-3 rounded-lg border text-left transition-all ${appliedClothing === opt.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <div className="font-bold text-xs text-gray-700">{opt.label}</div>
                <div className="text-[10px] text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Background Selection */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">背景の設定</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onBgAction(BackgroundOption.None)}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all col-span-2 ${appliedBg === BackgroundOption.None ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:bg-gray-50'}`}
            >
              <div className="w-5 h-5 rounded-full border border-gray-300 bg-white flex items-center justify-center text-[10px] text-gray-400">×</div>
              <span className="text-xs font-bold text-gray-700">背景を変更しない</span>
            </button>
            {bgItems.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onBgAction(opt.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${appliedBg === opt.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <div className={`w-5 h-5 rounded-full border border-gray-200 shadow-inner ${opt.color}`}></div>
                <span className="text-[11px] font-bold text-gray-700">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Area */}
        <div className="pt-6 mt-auto border-t border-gray-100 space-y-3">
          <button
            onClick={onStartCrop}
            disabled={disabled}
            className="w-full py-4 bg-white text-gray-700 border border-gray-300 font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all text-xs"
          >
            構図の微調整 (トリミング)
          </button>
          <button
            onClick={onDownload}
            disabled={disabled}
            className="w-full py-5 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3 text-sm"
          >
            画像を保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
