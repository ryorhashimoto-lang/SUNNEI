
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, ClothingOption, BackgroundOption, ProcessingStatus, CompanyInfo, CropConfig } from './types';
import UploadArea from './components/UploadArea';
import ActionPanel from './components/ActionPanel';
import PhotoCanvas from './components/PhotoCanvas';
import CropTool from './components/CropTool';
import LoginScreen from './components/LoginScreen';
import ManagementDashboard from './components/ManagementDashboard';
import { applyBackgroundSynthesis, applyClothingSynthesis } from './services/geminiService';
import { authService, AuthSession } from './services/authService';
import { usageService } from './services/usageService';
import { drawMemorialPhoto } from './services/renderService';

const Logo = () => (
  <div className="flex items-center gap-3 select-none">
    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm">瞬</div>
    <div className="flex flex-col justify-center">
      <span className="text-2xl font-serif font-bold text-gray-900 tracking-wider leading-none">瞬影</span>
      <span className="text-[12px] font-sans tracking-[0.3em] text-gray-500 uppercase mt-0.5 leading-none">SHUNNEI</span>
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
    setAppState(AppState.CROPPING);
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
      setAppliedBg(BackgroundOption.None);
      setPersonImage(appliedClothing === ClothingOption.None ? null : personImage);
      return;
    }

    setStatus({ isProcessing: true, message: '背景をAIで生成中...' });
    try {
      const base = personImage || originalCropped;
      const result = await applyBackgroundSynthesis(base, option);
      setPersonImage(result);
      setAppliedBg(option);
    } catch (e) {
      setErrorModal({ isOpen: true, title: 'エラー', message: '背景の合成に失敗しました。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  };

  const handleClothingAction = async (option: ClothingOption) => {
    if (!originalCropped) return;
    if (option === ClothingOption.None) {
      setAppliedClothing(ClothingOption.None);
      setPersonImage(appliedBg === BackgroundOption.None ? null : personImage);
      return;
    }

    setStatus({ isProcessing: true, message: '衣装をAIで変更中...' });
    try {
      const base = personImage || originalCropped;
      const result = await applyClothingSynthesis(base, option);
      setPersonImage(result);
      setAppliedClothing(option);
    } catch (e) {
      setErrorModal({ isOpen: true, title: 'エラー', message: '衣服の変更に失敗しました。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  };

  const handleDownload = async () => {
    if (!originalCropped || !companyInfo) return;
    setStatus({ isProcessing: true, message: '高品質画像を生成中...' });
    try {
      const canvas = document.createElement('canvas');
      const width = 2700;
      const height = 3600;
      await drawMemorialPhoto({ 
        canvas, 
        originalCropped, 
        personImage, 
        width, 
        height, 
        isHighRes: true,
        finalCropConfig 
      });
      
      await usageService.incrementUsage(companyInfo.id);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = deceasedName.trim() ? `遺影_${deceasedName}.png` : `遺影.png`;
      link.click();
    } catch (err) { 
      setErrorModal({ isOpen: true, title: '保存失敗', message: 'エラーが発生しました。' });
    } finally {
      setStatus({ isProcessing: false, message: '' });
    }
  };

  return (
    <div className="h-screen bg-[#f8f9fa] text-gray-800 font-serif flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200 shrink-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo />
          {companyInfo && (
            <div className="text-right">
              <p className="text-sm font-bold">{companyInfo.name}</p>
              <button onClick={() => setIsLogoutConfirmOpen(true)} className="text-xs text-gray-400 hover:text-red-600">ログアウト</button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center overflow-hidden">
        {appState === AppState.LOGIN ? <LoginScreen onLogin={handleLogin} /> : (
          isAdminMode ? <ManagementDashboard /> : (
            <div className="w-full h-full flex flex-col">
              {appState === AppState.UPLOAD && <UploadArea onImageSelected={handleImageSelected} />}
              {appState === AppState.CROPPING && uploadedImage && (
                <CropTool 
                  imageSrc={isFinalCropping ? compositePreview! : uploadedImage} 
                  onConfirm={handleCropConfirm} 
                  onCancel={() => setAppState(AppState.UPLOAD)} 
                />
              )}
              {appState === AppState.EDITING && (
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                  <div className="md:col-span-8 bg-gray-100 flex items-center justify-center p-8">
                    <PhotoCanvas 
                      originalCropped={originalCropped} 
                      personImage={personImage} 
                      isLoading={status.isProcessing} 
                      loadingMessage={status.message}
                    />
                  </div>
                  <div className="md:col-span-4 h-full">
                    <ActionPanel 
                      onBgAction={handleBgAction}
                      onClothingAction={handleClothingAction}
                      appliedBg={appliedBg}
                      appliedClothing={appliedClothing}
                      disabled={status.isProcessing} 
                      onDownload={handleDownload} 
                      onReset={() => setAppState(AppState.UPLOAD)} 
                      onStartCrop={() => {}} // 簡略化のため空
                      userPlan={companyInfo!.plan} 
                      usageCount={usageCount} 
                      deceasedName={deceasedName} 
                      onDeceasedNameChange={setDeceasedName} 
                    />
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-8 rounded-xl max-w-md w-full text-center">
            <h3 className="text-xl font-bold mb-4">{errorModal.title}</h3>
            <p className="mb-8">{errorModal.message}</p>
            <button onClick={() => setErrorModal({...errorModal, isOpen: false})} className="w-full py-4 bg-gray-900 text-white rounded-lg">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
