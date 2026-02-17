
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
    { id: ClothingOption.MensSuitBlack, label: '黒礼服', desc: '葬儀・告別式の正装' },
    { id: ClothingOption.MensKimono, label: '黒紋付', desc: '最も格調高い和装' },
    { id: ClothingOption.MensSuitNavy, label: '紺スーツ', desc: '穏やかで誠実な印象' },
  ];

  const womenOptions = [
    { id: ClothingOption.WomensSuitBlack, label: '黒洋装', desc: '落ち着いたアンサンブル' },
    { id: ClothingOption.WomensKimonoBlack, label: '黒喪服', desc: '最も格式高い和服' },
    { id: ClothingOption.WomensKimonoColor, label: '訪問着', desc: '上品な淡い色合い' },
  ];

  const currentClothingOptions = gender === 'men' ? menOptions : womenOptions;

  const bgItems = [
    { id: BackgroundOption.SoftBlue, label: '浅葱 (青)', color: 'bg-blue-100' },
    { id: BackgroundOption.SoftPink, label: '桜色 (桃)', color: 'bg-pink-100' },
    { id: BackgroundOption.WisteriaPurple, label: '藤色 (紫)', color: 'bg-purple-200' },
    { id: BackgroundOption.FreshGreen, label: '若草 (緑)', color: 'bg-green-100' },
    { id: BackgroundOption.WarmBeige, label: '鳥の子 (肌)', color: 'bg-orange-50' },
    { id: BackgroundOption.WhiteGrey, label: '白磁 (灰)', color: 'bg-gray-100' },
    { id: BackgroundOption.CloudyGrey, label: '雲模様', color: 'bg-stone-300' },
    { id: BackgroundOption.Floral, label: '菊の背景', color: 'bg-yellow-50' },
    { id: BackgroundOption.SolidBlack, label: '漆黒 (黒)', color: 'bg-black' },
  ];

  const StepBadge = ({ num, text }: { num: string, text: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold font-sans">{num}</span>
      <h3 className="text-sm font-bold text-gray-800 font-serif tracking-wider">{text}</h3>
    </div>
  );

  return (
    <div className="bg-white flex flex-col h-full border-l border-gray-200 shadow-xl z-10 font-sans overflow-hidden">
      
      {/* Upper Info Bar */}
      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
        <button 
          onClick={onReset}
          disabled={disabled}
          className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-all text-[11px] font-bold disabled:opacity-30"
        >
          <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:border-gray-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </div>
          最初からやり直す
        </button>

        <div className="text-right">
          <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase leading-none mb-1">{userPlan} PLAN</p>
          <p className="text-xs font-bold text-gray-700 leading-none">残枚数: <span className="text-blue-600">{remaining}</span></p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
        
        {/* Step 1: Background */}
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]">
          <StepBadge num="1" text="背景の選択" />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onBgAction(BackgroundOption.None)}
              disabled={disabled}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all col-span-2 ${appliedBg === BackgroundOption.None ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:bg-white'}`}
            >
              <div className="w-6 h-6 rounded-full border border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400">×</div>
              <span className="text-xs font-bold text-gray-700">現在の背景を活かす</span>
            </button>
            {bgItems.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onBgAction(opt.id)}
                disabled={disabled}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left group ${appliedBg === opt.id ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900 shadow-md' : 'border-gray-100 hover:border-gray-300 hover:bg-white'}`}
              >
                <div className={`w-6 h-6 rounded-full border border-gray-200 shadow-inner flex-shrink-0 ${opt.color} group-hover:scale-110 transition-transform`}></div>
                <span className="text-[10px] font-bold text-gray-600 leading-tight truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Clothing */}
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]">
          <StepBadge num="2" text="服装の着せ替え" />
          
          <div className="flex mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setGender('men')}
              disabled={disabled}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${gender === 'men' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              男性用
            </button>
            <button
              onClick={() => setGender('women')}
              disabled={disabled}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${gender === 'women' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              女性用
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onClothingAction(ClothingOption.None)}
              disabled={disabled}
              className={`w-full p-3 rounded-xl border text-left transition-all ${appliedClothing === ClothingOption.None ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
            >
              <div className="font-bold text-xs text-gray-700">着せ替えを行わない</div>
            </button>
            {currentClothingOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onClothingAction(opt.id)}
                disabled={disabled}
                className={`w-full p-3 rounded-xl border text-left transition-all relative group ${appliedClothing === opt.id ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
              >
                <div className="font-bold text-xs text-gray-700">{opt.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                {appliedClothing === opt.id && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center shadow-lg">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Step 3: Finishing */}
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms]">
          <StepBadge num="3" text="仕上げと微調整" />
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60">
              <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">故人様のお名前（ファイル名）</label>
              <input 
                type="text" 
                value={deceasedName}
                onChange={(e) => onDeceasedNameChange(e.target.value)}
                placeholder="例: 山田 太郎"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all font-bold placeholder:font-normal placeholder:text-gray-300"
              />
            </div>

            <button
              onClick={onStartCrop}
              disabled={disabled}
              className="w-full py-3.5 bg-white text-gray-600 border border-gray-300 font-bold rounded-xl text-xs hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5" />
              </svg>
              構図（トリミング）を微調整
            </button>
          </div>
        </section>
      </div>

      {/* Primary Action Button */}
      <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
        <button
          onClick={onDownload}
          disabled={disabled || !deceasedName}
          className={`w-full py-5 text-white font-bold rounded-2xl shadow-2xl transition-all flex flex-col items-center justify-center gap-1 active:scale-95 disabled:opacity-30 disabled:grayscale ${disabled ? 'bg-gray-700 cursor-wait' : 'bg-gray-900 cursor-pointer hover:bg-black hover:-translate-y-0.5'}`}
        >
          {disabled ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-sm">AI処理を実行中...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="text-sm tracking-widest">高品質データを保存</span>
              </div>
              <span className="text-[10px] text-gray-400 font-normal tracking-wider opacity-80 uppercase">Save to Device</span>
            </>
          )}
        </button>
        {!deceasedName && !disabled && (
          <p className="text-[10px] text-amber-600 text-center mt-3 font-bold bg-amber-50 py-2 rounded-lg border border-amber-100 animate-pulse">
            ※ 保存にはお名前の入力が必要です
          </p>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e5e5e5; }
      `}</style>
    </div>
  );
};

export default ActionPanel;
