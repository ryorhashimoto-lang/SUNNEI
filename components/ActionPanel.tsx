
import React, { useState } from 'react';
import { EditAction, UserPlan, PLAN_LIMITS } from '../types';

interface ActionPanelProps {
  onApplyBackground: (colorCode: string) => void;
  onApplyClothing: (action: EditAction) => void;
  disabled: boolean;
  onDownload: () => void;
  onBack: () => void;
  onResetToOriginal: () => void;
  onStartCrop: () => void;
  userPlan: UserPlan;
  usageCount: number;
  deceasedName: string;
  onDeceasedNameChange: (name: string) => void;
}

const ClothingThumbnail = ({ 
  type, 
  gender, 
  color = "bg-gray-900"
}: { 
  type: 'suit' | 'kimono', 
  gender?: 'mens' | 'womens', 
  color?: string
}) => {
  return (
    <div className={`w-14 h-14 rounded-lg ${color} relative overflow-hidden shadow-inner flex items-center justify-center border border-white/10`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
      
      {type === 'suit' ? (
        <div className="relative w-full h-full flex flex-col items-center">
          <div className="absolute top-0 w-8 h-6 bg-white clip-path-v-neck"></div>
          {gender === 'mens' && (
            <div className="absolute top-0 w-2 h-10 bg-gray-800 shadow-sm z-10"></div>
          )}
          <div className="absolute top-0 w-full h-full flex justify-between px-0.5">
            <div className="w-5 h-12 bg-inherit border-r border-white/10 -rotate-12 origin-top-left shadow-lg"></div>
            <div className="w-5 h-12 bg-inherit border-l border-white/10 rotate-12 origin-top-right shadow-lg"></div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center">
          <div className="absolute top-0 w-6 h-12 bg-white/90 rotate-[30deg] origin-top translate-x-[-1px]"></div>
          <div className="absolute top-0 w-6 h-12 bg-white/90 -rotate-[30deg] origin-top translate-x-[1px]"></div>
          <div className="absolute top-0 w-8 h-16 bg-inherit border-r border-white/5 rotate-[30deg] origin-top translate-x-[-3px] shadow-sm"></div>
          <div className="absolute top-0 w-8 h-16 bg-inherit border-l border-white/5 -rotate-[30deg] origin-top translate-x-[3px] shadow-md"></div>
        </div>
      )}
      <style>{`
        .clip-path-v-neck {
          clip-path: polygon(0 0, 100% 0, 50% 100%);
        }
      `}</style>
    </div>
  );
};

const ActionPanel: React.FC<ActionPanelProps> = ({ 
  onApplyBackground, 
  onApplyClothing,
  disabled, 
  onDownload, 
  onBack,
  onResetToOriginal,
  onStartCrop,
  userPlan,
  usageCount,
  deceasedName,
  onDeceasedNameChange
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('#BFEFFF');
  const [selectedClothing, setSelectedClothing] = useState<EditAction | null>(null);
  const [clothingTab, setClothingTab] = useState<'mens' | 'womens'>('mens');
  
  const limit = PLAN_LIMITS[userPlan];
  const remaining = limit === Infinity ? '無制限' : Math.max(0, limit - usageCount);

  const isWomen = clothingTab === 'womens';
  const themeBorder = isWomen ? 'border-rose-500' : 'border-blue-600';
  const themeBg = isWomen ? 'bg-rose-50' : 'bg-blue-50';

  const bgColors = [
    { code: '#BFEFFF', label: 'ブルー' },
    { code: '#D9D9D9', label: 'グレー' },
    { code: '#FFE4E8', label: 'ピンク' },
    { code: '#FEF3D1', label: 'イエロー' },
    { code: '#F3E5F5', label: 'パープル' },
    { code: '#F2F2F2', label: 'ホワイト' },
  ];

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-y-auto font-sans">
      
      <div className="flex items-center justify-between mb-6">
        <button 
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-800 transition-colors text-sm font-bold group cursor-pointer disabled:opacity-30"
        >
          <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
          </div>
          戻る
        </button>

        <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-right min-w-[90px]">
          <p className="text-[10px] text-gray-400 font-sans tracking-widest uppercase mb-0.5 leading-none">{userPlan}プラン</p>
          <p className="text-[12px] font-sans font-bold text-gray-700 leading-none">
            残り: {remaining}{typeof remaining === 'number' && '枚'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        
        {/* Step 0: Deceased Name */}
        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <h3 className="font-bold text-blue-800 text-sm">故人様のお名前</h3>
          </div>
          <input 
            type="text" 
            value={deceasedName}
            onChange={(e) => onDeceasedNameChange(e.target.value)}
            placeholder="ファイル名に反映"
            className="w-full px-4 py-3 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all font-bold placeholder:font-normal placeholder:text-blue-300"
          />
        </div>

        {/* Section 1: Background */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[11px] font-bold">1</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">背景色を選択</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {bgColors.map((item) => (
              <button 
                key={item.code}
                type="button" 
                onClick={() => setSelectedColor(item.code)} 
                className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-20 ${
                  selectedColor === item.code 
                  ? `border-blue-600 bg-blue-50 shadow-md` 
                  : `bg-white text-gray-600 border-gray-100 hover:border-gray-300 hover:shadow-sm`
                }`}
              >
                <div 
                  className={`w-8 h-8 rounded-full shadow-inner border border-black/5 transition-transform duration-300 ${selectedColor === item.code ? 'scale-110 shadow-md' : ''}`}
                  style={{ backgroundColor: item.code }}
                ></div>
                <span className="font-bold text-[10px] whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => onApplyBackground(selectedColor)}
            disabled={disabled}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all text-xs disabled:opacity-50"
          >
            背景色を確定（AI生成）
          </button>
        </div>

        {/* Section 2: Clothing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[11px] font-bold">2</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">着せ替えを選択</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-100 p-0.5 rounded-lg flex gap-1">
              {(['mens', 'womens'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setClothingTab(t);
                    setSelectedClothing(null); // タブ切り替え時に選択をクリア
                  }}
                  className={`flex-1 py-3 text-xs font-bold rounded-md transition-all ${
                    clothingTab === t 
                    ? (t === 'womens' ? 'bg-rose-500 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm') 
                    : 'text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t === 'mens' ? '男性用' : '女性用'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(clothingTab === 'mens' ? 
                [{a: EditAction.SUIT_MENS, l: '洋装（礼服）'}, {a: EditAction.KIMONO_MENS, l: '和装（紋付）'}] : 
                [{a: EditAction.SUIT_WOMENS, l: '洋装（喪服）'}, {a: EditAction.KIMONO_WOMENS, l: '和装（喪服）'}]
              ).map(item => (
                <button 
                  key={item.a}
                  onClick={() => setSelectedClothing(item.a)} 
                  className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 ${
                    selectedClothing === item.a 
                    ? `${themeBorder} ${themeBg} shadow-md` 
                    : `border-gray-100 bg-white hover:border-blue-200`
                  }`}
                >
                  <ClothingThumbnail type={item.l.includes('和装') ? 'kimono' : 'suit'} gender={clothingTab} />
                  <span className="font-bold text-[11px] whitespace-nowrap">{item.l}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => selectedClothing && onApplyClothing(selectedClothing)}
              disabled={disabled || !selectedClothing}
              className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-all text-xs disabled:opacity-50"
            >
              服装を確定（AI生成）
            </button>
          </div>
        </div>

        {/* Section 3: Final Adjustments */}
        <div className="pt-6 mt-auto border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
             <button
               onClick={onResetToOriginal}
               disabled={disabled}
               className="py-3 bg-white text-gray-500 border border-gray-200 font-bold rounded-lg hover:bg-gray-50 transition-all text-[11px] disabled:opacity-50"
             >
               最初に戻す
             </button>
             <button
               onClick={onStartCrop}
               disabled={disabled}
               className="py-3 bg-white text-gray-700 border border-gray-300 font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all text-[11px] disabled:opacity-50"
             >
               構図を微調整
             </button>
          </div>
          <button
            onClick={onDownload}
            disabled={disabled}
            className="w-full py-5 bg-emerald-600 text-white font-bold rounded-lg shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
          >
            完成した画像を保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
