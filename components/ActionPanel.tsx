
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

  // 背景色のタイル定義
  const bgItems = [
    { id: BackgroundOption.SoftBlue, label: '浅葱 (青)', color: 'bg-[#e3f2fd]', text: 'text-gray-900' },
    { id: BackgroundOption.SoftPink, label: '桜色 (桃)', color: 'bg-[#fce4ec]', text: 'text-gray-900' },
    { id: BackgroundOption.WisteriaPurple, label: '藤色 (紫)', color: 'bg-[#f3e5f5]', text: 'text-gray-900' },
    { id: BackgroundOption.FreshGreen, label: '若草 (緑)', color: 'bg-[#f1f8e9]', text: 'text-gray-900' },
    { id: BackgroundOption.WhiteGrey, label: '白磁 (灰)', color: 'bg-[#fafafa]', text: 'text-gray-900' },
  ];

  const StepBadge = ({ num, text }: { num: string, text: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-bold font-sans shadow-sm ring-4 ring-gray-100">{num}</div>
      <h3 className="text-[15px] font-bold text-gray-800 font-serif tracking-widest">{text}</h3>
    </div>
  );

  return (
    <div className="bg-white flex flex-col h-full border-l border-gray-200 shadow-xl z-10 font-sans overflow-hidden">
      
      {/* Upper Info Bar */}
      <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between shrink-0 backdrop-blur-sm">
        <button 
          onClick={onReset}
          disabled={disabled}
          className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-all text-[11px] font-bold disabled:opacity-30"
        >
          <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:border-gray-400 shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </div>
          やり直す
        </button>

        <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm text-right min-w-[100px]">
          <p className="text-[8px] text-gray-400 font-bold tracking-[0.2em] uppercase leading-none mb-1.5">{userPlan} PLAN</p>
          <p className="text-xs font-bold text-gray-800 leading-none">残: <span className="text-blue-600 font-mono text-sm">{remaining}</span></p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-12 custom-scrollbar">
        
        {/* Step 1: Background - 全面タイルUI */}
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]">
          <StepBadge num="1" text="背景の選択" />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onBgAction(BackgroundOption.None)}
              disabled={disabled}
              className={`flex items-center justify-center p-4 rounded-2xl border-2 text-center transition-all col-span-2 min-h-[55px] relative group ${appliedBg === BackgroundOption.None ? 'border-gray-900 bg-gray-100 ring-4 ring-gray-900/5 shadow-md' : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'}`}
            >
              <span className="text-xs font-bold text-gray-700">元の背景（変更なし）</span>
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
                className={`flex items-center justify-center p-4 rounded-2xl border-2 transition-all min-h-[75px] relative group ${opt.color} ${opt.text} ${appliedBg === opt.id ? 'border-gray-900 shadow-xl scale-[1.03] z-10 ring-4 ring-gray-900/5' : 'border-transparent hover:scale-105 shadow-sm opacity-90 hover:opacity-100'}`}
              >
                <span className="text-[12px] font-bold tracking-tight text-center px-1 leading-tight">{opt.label}</span>
                {appliedBg === opt.id && (
                  <div className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-0.5 shadow-sm backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-900">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Clothing - 性別色分けUI */}
        <section className="animate-fade-in translate-y-2 opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]">
          <StepBadge num="2" text="服装の着せ替え" />
          
          <div className="flex mb-5 bg-gray-100 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setGender('men')}
              disabled={disabled}
              className={`flex-1 py-3 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${gender === 'men' ? 'bg-[#1e3a8a] text-white shadow-[0_4px_12px_rgba(30,58,138,0.3)] ring-1 ring-[#1e3a8a]/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5Zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3Zm9 11v-1a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1Z"/>
              </svg>
              男性用
            </button>
            <button
              onClick={() => setGender('women')}
              disabled={disabled}
              className={`flex-1 py-3 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${gender === 'women' ? 'bg-[#be123c] text-white shadow-[0_4px_12px_rgba(190,18,60,0.3)] ring-1 ring-[#be123c]/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5Zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3Zm9 11v-1a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1Z"/>
              </svg>
              女性用
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onClothingAction(ClothingOption.None)}
              disabled={disabled}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${appliedClothing === ClothingOption.None ? 'border-gray-900 bg-gray-50 ring-4 ring-gray-900/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300 shadow-sm'}`}
            >
              <div className="font-bold text-xs text-gray-700">お召し物を変更しない</div>
            </button>
            {currentClothingOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onClothingAction(opt.id)}
                disabled={disabled}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all relative group ${appliedClothing === opt.id ? 'border-gray-900 bg-gray-50 ring-4 ring-gray-900/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300 shadow-sm'}`}
              >
                <div className="font-bold text-[13px] text-gray-800">{opt.label}</div>
                <div className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">{opt.desc}</div>
                {appliedClothing === opt.id && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
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
          
          <div className="space-y-5">
            <div className="bg-gray-50/80 p-5 rounded-[2rem] border border-gray-200/60 shadow-inner group">
              <label className="block text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest ml-1">故人様のお名前</label>
              <input 
                type="text" 
                value={deceasedName}
                onChange={(e) => onDeceasedNameChange(e.target.value)}
                placeholder="例: 山田 太郎"
                className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl text-[15px] outline-none focus:border-gray-900 transition-all font-serif font-bold placeholder:font-normal placeholder:text-gray-300 shadow-sm focus:shadow-md"
              />
              <p className="text-[9px] text-gray-400 mt-2 ml-1 leading-none italic">※ 保存時のファイル名に反映されます</p>
            </div>

            <button
              onClick={onStartCrop}
              disabled={disabled}
              className="w-full py-4.5 bg-white text-gray-700 border-2 border-gray-200 font-bold rounded-2xl text-[11px] hover:bg-gray-50 hover:border-gray-900 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5" />
              </svg>
              構図（トリミング）を最終調整
            </button>
          </div>
        </section>
      </div>

      {/* Primary Action Button */}
      <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-15px_45px_rgba(0,0,0,0.06)] shrink-0 z-20 relative">
        <button
          onClick={onDownload}
          disabled={disabled || !deceasedName}
          className={`w-full py-6 text-white font-bold rounded-[2.25rem] shadow-2xl transition-all flex flex-col items-center justify-center gap-1.5 active:scale-[0.96] disabled:opacity-30 disabled:grayscale ${disabled ? 'bg-gray-700 cursor-wait' : 'bg-gray-900 cursor-pointer hover:bg-black hover:-translate-y-1.5'}`}
        >
          {disabled ? (
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-[15px] font-sans font-medium tracking-tight">AIが写真を修復しています...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="text-[16px] tracking-[0.2em] font-serif">高品質データを保存</span>
              </div>
              <span className="text-[9px] text-gray-500 font-bold tracking-[0.3em] opacity-90 uppercase font-sans">Premium Studio Export</span>
            </>
          )}
        </button>
        {!deceasedName && !disabled && (
          <div className="mt-4 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 shrink-0">
               <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <p className="text-[10px] text-amber-700 font-bold font-sans">
              ※ 保存には「故人様のお名前」が必要です
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f0f0f0; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e0e0e0; }
      `}</style>
    </div>
  );
};

export default ActionPanel;
