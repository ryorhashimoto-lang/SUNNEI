import React, { useState, useEffect } from 'react';
import { AppState, ClothingOption, BackgroundOption, ProcessingStatus, CompanyInfo, CropConfig } from './types';
import UploadArea from './components/UploadArea';
import ActionPanel from './components/ActionPanel';
import PhotoCanvas from './components/PhotoCanvas';
import CropTool from './components/CropTool';
import LoginScreen from './components/LoginScreen';
import ManagementDashboard from './components/ManagementDashboard';
import {
  applyBackgroundSynthesis,
  applyClothingSynthesis,
} from './services/geminiService';
import { authService, AuthSession } from './services/authService';
import { usageService } from './services/usageService';
import { drawMemorialPhoto } from './services/renderService';

const Logo = () => (
  <div className="flex items-center gap-4 select-none group">
    <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-serif font-bold text-2xl shadow-xl group-hover:scale-105 transition-transform duration-500">瞬</div>
    <div className="flex flex-col justify-center">
      <span className="text-3xl font-serif font-bold text-gray-900 tracking-[0.1em] leading-none">瞬影</span>
      <span className="text-[10px] font-sans tracking-[0.5em] text-gray-400 uppercase mt-1 leading-none">SHUNNEI STUDIO</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalCropped, setOriginalCropped] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [appliedBg, setAppliedBg] = useState<BackgroundOption>(BackgroundOption.None);
  const [appliedClothing, setAppliedClothing] = useState<ClothingOption>(ClothingOption.None);
  
  const [cropConfig, setCropConfig] = useState<CropConfig | null>(null);
  const [finalCropConfig, setFinalCropConfig] = useState<CropConfig | null>(null);
  const [isFinalCropping, setIsFinalCropping] = useState(false);
  const [compositePreview, setCompositePreview] = useState<string | null>(null);

  const [deceasedName, setDeceasedName] = useState<string>('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });

  useEffect(() => {
    const session = authService.getSession();
    if (session) {
      setCompanyInfo(session.company);
      setUsageCount((session.company as any).usageCount || 0);
      setIsAdminMode(session.company.id === 'admin');
      setAppState(AppState.UPLOAD);
    }
  }, []);

  const handleLogin = (session: AuthSession) => {
    setCompanyInfo(session.company);
    setUsageCount((session.company as any).usageCount || 0);
    setIsAdminMode(session.company.id === 'admin');
    setAppState(AppState.UPLOAD);
  };

  const handleImageSelected = (base64: string) => {
    setUploadedImage(base64);
    // Reset all states for new image
    setCropConfig(null);
    setFinalCropConfig(null);
    setOriginalCropped(null);
    setPersonImage(null);
    setAppliedBg(BackgroundOption.None);
    setAppliedClothing(ClothingOption.None);
    setCompositePreview(null);
    setIsFinalCropping(false);
    
    setAppState(AppState.CROPPING);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setOriginalCropped(null);
    setPersonImage(null);
    setCropConfig(null);
    setFinalCropConfig(null);
    setCompositePreview(null);
    setIsFinalCropping(false);
    setAppliedBg(BackgroundOption.None);
    setAppliedClothing(ClothingOption.None);
    setDeceasedName('');
    setAppState(AppState.UPLOAD);
  };

  const handleCropConfirm = (croppedImage: string, config: CropConfig) => {
    if (isFinalCropping) {
      setFinalCropConfig(config);
      setIsFinalCropping(false);
      setAppState(AppState.EDITING);
    } else {
      setOriginalCropped(croppedImage); 
      setCropConfig(config);
      setPersonImage(null);
      setAppliedBg(BackgroundOption.None);
      setAppliedClothing(ClothingOption.None);
      setAppState(AppState.EDITING); 
    }
  };

  const handleBgAction = async (option: BackgroundOption) => {
  if (!originalCropped) return;
  if (option === BackgroundOption.None) {
    setPersonImage(null);
    setAppliedBg(BackgroundOption.None);
    setAppliedClothing(ClothingOption.None);
    return;
  }

  setStatus({ isProcessing: true, message: '背景を合成中...' });
  try {
    const base = personImage || originalCropped;
    const result = await applyBackgroundSynthesis(base, option, 1200, 1440);
    setPersonImage(result);
    setAppliedBg(option);
  } catch (e) {
    setErrorModal({
      isOpen: true,
      title: '背景合成エラー',
      message: '背景の合成に失敗しました。時間をおいて再度お試しください。',
    });
  } finally {
    setStatus({ isProcessing: false, message: '' });
  }
};

  const handleClothingAction = async (option: ClothingOption) => {
  if (!originalCropped) return;
  if (option === ClothingOption.None && appliedBg === BackgroundOption.None) {
      setPersonImage(null);
      setAppliedClothing(ClothingOption.None);
      return;
  }

  setStatus({ isProcessing: true, message: '服装を変更中...' });
  try {
    const base = personImage || originalCropped;
    // プレビュー用サイズ：1200 x 1440
    const result = await applyClothingSynthesis(base, option);
    setPersonImage(result);
    setAppliedClothing(option);
  } catch (e) {
    setErrorModal({ isOpen: true, title: '生成エラー', message: '衣装の変更に失敗しました。' });
  } finally {
    setStatus({ isProcessing: false, message: '' });
  }
};

  const handleStartFinalCrop = async () => {
    if (!originalCropped) return;
    setStatus({ isProcessing: true, message: '調整用データを準備しています...' });
    try {
      const canvas = document.createElement('canvas');
      const width = 1200;
      const height = 1440;
      await drawMemorialPhoto({ 
        canvas, 
        originalCropped, 
        personImage, 
        width, 
        height, 
        isHighRes: false, 
        finalCropConfig: null,
        backgroundOption: appliedBg
      });
      setCompositePreview(canvas.toDataURL('image/jpeg', 0.9));
      setIsFinalCropping(true);
      setAppState(AppState.CROPPING);
    } catch (e) {
      setErrorModal({ isOpen: true, title: 'エラー', message: 'プレビューの生成に失敗しました。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  };

  const handleDownload = async (type: 'four-cut' | 'three-four') => {
    if (!originalCropped || !companyInfo) return;
    setStatus({ isProcessing: true, message: '最高画質で画像を生成しています...' });
    try {
      const canvas = document.createElement('canvas');
      let width = 3000;
      let height = 3600; // Default 5:6 (Four Cut)
      let filenameSuffix = "";

      if (type === 'three-four') {
        width = 3000;
        height = 4000; // 3:4
        filenameSuffix = "_3-4";
      }

       await drawMemorialPhoto({ 
        canvas, 
        originalCropped, 
        personImage, 
        width, 
        height, 
        isHighRes: true, 
        finalCropConfig,
        backgroundOption: appliedBg
      });
      
      const newCount = await usageService.incrementUsage(companyInfo.id);
      setUsageCount(newCount);
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = deceasedName.trim() ? `瞬影_${deceasedName}${filenameSuffix}.png` : `瞬影_遺影${filenameSuffix}.png`;
      link.click();
    } catch (err) { 
      setErrorModal({ isOpen: true, title: '保存失敗', message: '画像の生成中にエラーが発生しました。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  };

  const handleLogout = () => {
    authService.logout();
    setAppState(AppState.LOGIN);
    setCompanyInfo(null);
    setIsLogoutConfirmOpen(false);
  };

  return (
    <div className="h-screen bg-[#f8f9fb] text-gray-800 font-serif flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="max-w-[1800px] mx-auto px-8 py-3.5 flex items-center justify-between">
          <Logo />
          {companyInfo && (
            <div className="flex items-center gap-6 group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-none">{companyInfo.name}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]"></span>
                  <span className="text-[9px] text-gray-400 font-sans tracking-widest uppercase font-bold">{companyInfo.plan} 会員</span>
                </div>
              </div>
              <button 
                onClick={() => setIsLogoutConfirmOpen(true)} 
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 shadow-sm md:shadow-none"
                title="ログアウト"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center overflow-hidden relative">
        {appState === AppState.LOGIN ? <LoginScreen onLogin={handleLogin} /> : (
          isAdminMode ? <ManagementDashboard /> : (
            <div className="w-full h-full flex flex-col overflow-hidden">
              {appState === AppState.UPLOAD && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fdfdfd]">
                  <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-5xl font-serif font-bold text-gray-900 mb-6 tracking-tight leading-tight">大切な思い出を、<br/>永遠の一枚に</h2>
                    <p className="text-gray-400 font-sans tracking-[0.4em] uppercase text-[10px] font-bold">Digital Photo Studio Experience</p>
                  </div>
                  <UploadArea onImageSelected={handleImageSelected} />
                </div>
              )}
              
              {appState === AppState.CROPPING && uploadedImage && (
                <CropTool 
                  imageSrc={isFinalCropping ? compositePreview! : uploadedImage} 
                  initialConfig={isFinalCropping ? finalCropConfig : cropConfig}
                  onConfirm={handleCropConfirm} 
                  onCancel={() => {
                    setIsFinalCropping(false);
                    setAppState(originalCropped ? AppState.EDITING : AppState.UPLOAD);
                  }} 
                  backgroundOption={appliedBg}
                  clothingOption={appliedClothing}
                />
              )}
              
              {appState === AppState.EDITING && (
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] overflow-hidden">
                  <div className="flex items-center justify-center p-6 md:p-16 lg:p-24 overflow-y-auto bg-[#e9ebed] relative">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <PhotoCanvas 
                      originalCropped={originalCropped} 
                      personImage={personImage} 
                      isLoading={status.isProcessing} 
                      loadingMessage={status.message}
                      finalCropConfig={finalCropConfig}
                    />
                  </div>
                  <ActionPanel 
                    onBgAction={handleBgAction}
                    onClothingAction={handleClothingAction}
                    appliedBg={appliedBg}
                    appliedClothing={appliedClothing}
                    disabled={status.isProcessing} 
                    onDownload={handleDownload} 
                    onReset={handleReset} 
                    onStartCrop={handleStartFinalCrop}
                    userPlan={companyInfo!.plan} 
                    usageCount={usageCount} 
                    deceasedName={deceasedName} 
                    onDeceasedNameChange={setDeceasedName}
                  />
                </div>
              )}
            </div>
          )
        )}
      </main>

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-fade-in">
          <div className="bg-white rounded-3xl p-10 text-center max-w-sm shadow-2xl border border-gray-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4 text-gray-900 leading-tight">ログアウトしても<br/>よろしいですか？</h3>
            <p className="text-gray-400 text-[13px] font-sans mb-10 leading-relaxed px-4">編集中のデータは破棄されます。<br/>セッションを終了しますか？</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsLogoutConfirmOpen(false)} className="py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all border border-gray-100">戻る</button>
              <button onClick={handleLogout} className="py-4 bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg hover:bg-red-700 shadow-red-200">終了する</button>
            </div>
          </div>
        </div>
      )}

      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white p-10 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4 text-gray-900 tracking-tight">{errorModal.title}</h3>
            <p className="mb-10 text-gray-500 leading-relaxed font-sans text-sm px-4">{errorModal.message}</p>
            <button 
              onClick={() => setErrorModal({...errorModal, isOpen: false})} 
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl active:scale-95"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
