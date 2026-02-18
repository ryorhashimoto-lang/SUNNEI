
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
    { id: BackgroundOption.SoftBlue, label: '浅葱 (青)', color: 'bg-[#e3f2fd]', text: 'text-gray-900' },
    { id: BackgroundOption.SoftPink, label: '桜色 (桃)', color: 'bg-[#fce4ec]', text: 'text-gray-900' },
    { id: BackgroundOption.WisteriaPurple, label: '藤色 (紫)', color: 'bg-[#f3e5f5]', text: 'text-gray-900' },
    { id: BackgroundOption.FreshGreen, label: '若草 (緑)', color: 'bg-[#f1f8e9]', text: 'text-gray-900' },
    { id: BackgroundOption.WhiteGrey, label: '白磁 (灰)', color: 'bg-[#fafafa]', text: 'text-gray-900' },
  ];

  const StepBadge = ({ num, text }: { num: string, text: string }) => (
    <div className="flex items-center gap-3.5 mb-6 group">
      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-bold font-sans shadow-lg ring-4 ring-gray-100 group-hover:scale-110 transition-transform">{num}</div>
      <div className="flex flex-col">
        <h3 className="text-[15px] font-bold text-gray-800 font-serif tracking-widest leading-none">{text}</h3>
        <div className="w-full h-[1px] bg-gray-100 mt-2"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-white flex flex-col h-full border-l border-gray-200 shadow-2xl z-10 font-sans overflow-hidden">
      
      {/* Upper Info Bar */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <button 
          onClick={onReset}
          disabled={disabled}
          className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-all text-[11px] font-bold disabled:opacity-30 active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:border-gray-400 shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </div>
          やり直す
        </button>

        <div className="bg-gray-50/80 px-4 py-2 rounded-2xl border border-gray-100 shadow-inner text-right min-w-[110px]">
          <p className="text-[8px] text-gray-400 font-bold tracking-[0.2em] uppercase leading-none mb-1.5">{userPlan} PLAN</p>
          <p className="text-[14px] font-bold text-gray-800 leading-none">残: <span className="text-blue-600 font-mono">{remaining}</span></p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-9 space-y-14 custom-scrollbar">
        
        {/* Step 1: Background - 全面カラータイルUI */}
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]">
          <StepBadge num="1" text="背景の選択" />
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onBgAction(BackgroundOption.None)}
              disabled={disabled}
              className={`flex items-center justify-center p-4 rounded-2xl border-2 text-center transition-all col-span-2 min-h-[60px] relative group active:scale-[0.98] ${appliedBg === BackgroundOption.None ? 'border-gray-900 bg-gray-50 ring-4 ring-gray-900/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}
            >
              <span className="text-xs font-bold text-gray-600">元の背景（変更しない）</span>
              {appliedBg === BackgroundOption.None && (
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                 </div>
              )}
            </button>
            {bgItems.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onBgAction(opt.id)}
                disabled={disabled}
                className={`flex items-center justify-center p-5 rounded-2xl border-2 transition-all min-h-[85px] relative group active:scale-[0.98] ${opt.color} ${opt.text} ${appliedBg === opt.id ? 'border-gray-900 shadow-xl scale-[1.03] z-10 ring-4 ring-gray-900/5' : 'border-transparent hover:scale-105 shadow-sm opacity-90 hover:opacity-100'}`}
              >
                <span className="text-[13px] font-bold tracking-tight text-center px-1 leading-tight">{opt.label}</span>
                {appliedBg === opt.id && (
                  <div className="absolute top-2 right-2 bg-white rounded-full p-0.5 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-900">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Clothing - 性別色分けボタン */}
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]">
          <StepBadge num="2" text="服装の着せ替え" />
          
          <div className="flex mb-6 bg-gray-100/80 p-1.5 rounded-2xl gap-2 shadow-inner">
            <button
              onClick={() => setGender('men')}
              disabled={disabled}
              className={`flex-1 py-3.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 active:scale-95 ${gender === 'men' ? 'bg-[#1e3a8a] text-white shadow-[0_4px_20px_rgba(30,58,138,0.4)]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              男性用 (紺)
            </button>
            <button
              onClick={() => setGender('women')}
              disabled={disabled}
              className={`flex-1 py-3.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 active:scale-95 ${gender === 'women' ? 'bg-[#be123c] text-white shadow-[0_4px_20px_rgba(190,18,60,0.4)]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              女性用 (紅)
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => onClothingAction(ClothingOption.None)}
              disabled={disabled}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${appliedClothing === ClothingOption.None ? 'border-gray-900 bg-gray-50 ring-4 ring-gray-900/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300 shadow-sm'}`}
            >
              <div className="font-bold text-[13px] text-gray-700">お召し物を変更しない</div>
            </button>
            {currentClothingOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onClothingAction(opt.id)}
                disabled={disabled}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all relative group active:scale-[0.98] ${appliedClothing === opt.id ? 'border-gray-900 bg-gray-50 ring-4 ring-gray-900/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300 shadow-sm'}`}
              >
                <div className="font-bold text-[15px] text-gray-800 tracking-tight">{opt.label}</div>
                <div className="text-[11px] text-gray-400 mt-2 leading-relaxed font-medium">{opt.desc}</div>
                {appliedClothing === opt.id && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center shadow-lg ring-[6px] ring-white">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
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
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms] pb-8">
          <StepBadge num="3" text="仕上げと最終調整" />
          
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner">
              <label className="block text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest ml-1 font-sans">故人様のお名前</label>
              <input 
                type="text" 
                value={deceasedName}
                onChange={(e) => onDeceasedNameChange(e.target.value)}
                placeholder="例: 山田 太郎 様"
                className="w-full px-6 py-5 bg-white border-2 border-transparent rounded-2xl text-[17px] outline-none focus:border-gray-900 transition-all font-serif font-bold placeholder:font-normal placeholder:text-gray-300 shadow-sm"
              />
              <p className="text-[10px] text-gray-400 mt-3 ml-1 italic font-sans">※ 保存時のファイル名として使用されます</p>
            </div>

            <button
              onClick={onStartCrop}
              disabled={disabled}
              className="w-full py-5 bg-white text-gray-800 border-2 border-gray-200 font-bold rounded-2xl text-[13px] tracking-widest hover:bg-gray-50 hover:border-gray-900 transition-all flex items-center justify-center gap-4 shadow-sm active:scale-[0.98] group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6 text-gray-400 group-hover:text-gray-900 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5" />
              </svg>
              構図（トリミング）を再調整
            </button>
          </div>
        </section>
      </div>

      {/* Primary Action Button */}
      <div className="p-8 bg-white border-t border-gray-100 shadow-[0_-20px_60px_rgba(0,0,0,0.1)] shrink-0 z-20 relative">
        <button
          onClick={onDownload}
          disabled={disabled || !deceasedName}
          className={`w-full py-8 text-white font-bold rounded-[2.75rem] shadow-2xl transition-all flex flex-col items-center justify-center gap-2.5 active:scale-[0.96] disabled:opacity-30 disabled:grayscale ${disabled ? 'bg-gray-800 cursor-wait' : 'bg-gray-900 cursor-pointer hover:bg-black hover:-translate-y-2'}`}
        >
          {disabled ? (
            <div className="flex items-center gap-5">
              <div className="w-8 h-8 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-[17px] font-sans font-medium tracking-tight">AIが修復を行っています...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="text-[20px] tracking-[0.3em] font-serif font-bold">高品質データを保存</span>
              </div>
              <span className="text-[10px] text-gray-500 font-bold tracking-[0.5em] opacity-80 uppercase font-sans">Studio Master Export</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;
