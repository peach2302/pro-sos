
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import IncidentForm from './components/IncidentForm';
import AdminDashboard from './components/AdminDashboard';
import LoginForm from './components/LoginForm';
import { IncidentReport, IncidentStatus } from './types';
import { sendIncidentToGoogleCloud, updateIncidentStatusInGoogleCloud } from './services/googleIntegration';
import { analyzeIncident } from './services/geminiService';

const STORAGE_KEY = 'nongthum_rescue_system_v9';
const SETTINGS_KEY = 'nongthum_admin_settings_v1';
const GOOGLE_SHEET_ID = '1l4fx2t3vuP0pbYzpAxlbc3i_bv8dqMjyo_KDl8uN79Y';
const GOOGLE_DRIVE_FOLDER_ID = '1U_8X-n1xqlQ3UNCGV8CpvmE35458X8sj';

export interface NotificationSettings {
  refreshInterval: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  vibrationPattern: 'pulse' | 'sos' | 'long';
  alertTone: 'beep' | 'siren' | 'pulse';
}

const App: React.FC = () => {
  const [view, setView] = useState<'citizen' | 'login' | 'admin'>('citizen');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [incidents, setIncidents] = useState<IncidentReport[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : {
      refreshInterval: 3000,
      soundEnabled: true,
      vibrationEnabled: true,
      vibrationPattern: 'pulse',
      alertTone: 'siren'
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastIncident, setLastIncident] = useState<IncidentReport | null>(null);

  useEffect(() => {
    if (view !== 'admin' || settings.refreshInterval === 0) return;
    const pollInterval = setInterval(() => {
      const latestFromStorage = localStorage.getItem(STORAGE_KEY);
      if (latestFromStorage) {
        const parsed = JSON.parse(latestFromStorage) as IncidentReport[];
        if (parsed.length !== incidents.length) {
          setIncidents(parsed);
        }
      }
    }, settings.refreshInterval); 
    return () => clearInterval(pollInterval);
  }, [view, incidents.length, settings.refreshInterval]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const session = localStorage.getItem('officer_session');
    if (session) {
      setIsAuthenticated(true);
      setView('admin');
    }
  }, []);

  const handleReportSubmit = async (formData: any) => {
    setIsSubmitting(true);
    setSubmitStep('กำลังส่งข้อมูลเบื้องต้นและภาพถ่าย...');
    
    const incidentId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newIncident: IncidentReport = {
      id: incidentId,
      ...formData,
      status: IncidentStatus.PENDING,
      severity: 'MEDIUM',
      createdAt: Date.now()
    };

    try {
      // 1. ส่งเข้า Google Cloud
      await sendIncidentToGoogleCloud(newIncident, GOOGLE_SHEET_ID, GOOGLE_DRIVE_FOLDER_ID);

      // 2. วิเคราะห์ด้วย AI
      setSubmitStep('AI กำลังวิเคราะห์เหตุฉุกเฉิน...');
      const aiResult = await analyzeIncident(formData.description, formData.mediaUrl, formData.mediaType === 'image' ? 'image/jpeg' : undefined);

      const finalIncident = { 
        ...newIncident, 
        severity: aiResult?.severity || 'MEDIUM', 
        description: aiResult?.summary || newIncident.description,
        advice: aiResult?.advice
      };
      
      setLastIncident(finalIncident);
      setIncidents(prev => [finalIncident, ...prev]);
      setShowSuccess(true);
    } catch (error) {
      console.error(error);
      setIncidents(prev => [newIncident, ...prev]);
      setShowSuccess(true); 
    } finally {
      setIsSubmitting(false);
      setSubmitStep('');
    }
  };

  const handleUpdateStatus = async (id: string, status: IncidentStatus, closingMediaUrl?: string, officerName?: string, officerPosition?: string, signatureUrl?: string) => {
    const target = incidents.find(inc => inc.id === id);
    if (!target) return;

    const updatedIncident: IncidentReport = { 
      ...target, 
      status, 
      acceptedAt: status === IncidentStatus.IN_PROGRESS ? Date.now() : target.acceptedAt,
      resolvedAt: status === IncidentStatus.RESOLVED ? Date.now() : target.resolvedAt,
      closingMediaUrl: closingMediaUrl || target.closingMediaUrl,
      signatureUrl: signatureUrl || target.signatureUrl,
      officerName: officerName || target.officerName,
      officerPosition: officerPosition || target.officerPosition
    };

    setIncidents(prev => prev.map(inc => inc.id === id ? updatedIncident : inc));

    // เมื่อปิดงาน สำเร็จ ส่งข้อมูลเข้า Google Drive/Sheet
    if (status === IncidentStatus.RESOLVED && officerName) {
      try {
        await updateIncidentStatusInGoogleCloud(
          id, 
          status, 
          closingMediaUrl || '', 
          officerName, 
          officerPosition || '', 
          GOOGLE_SHEET_ID, 
          GOOGLE_DRIVE_FOLDER_ID,
          updatedIncident // ส่งข้อมูลพร้อมลายเซ็นและภาพสรุปงาน
        );
      } catch (err) {
        console.error("Cloud Update Error:", err);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('officer_session');
    setView('citizen');
  };

  const toggleView = () => {
    if (view === 'admin') setView('citizen');
    else if (view === 'login') setView('citizen');
    else isAuthenticated ? setView('admin') : setView('login');
  };

  if (showSuccess) {
    return (
      <Layout title="ส่งข้อมูลสำเร็จ" isAuthenticated={isAuthenticated} onToggleView={toggleView}>
        <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[70vh] animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-white">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase">แจ้งเหตุแล้ว</h2>
          <p className="text-slate-500 mb-6">เจ้าหน้าที่กำลังดำเนินการช่วยเหลือ</p>
          <div className="bg-slate-50 px-8 py-5 rounded-[2.5rem] mb-10 border border-slate-200 shadow-inner">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">REFERENCE NO.</span>
            <span className="text-3xl font-black text-red-600 tracking-tighter">#{lastIncident?.id}</span>
          </div>
          {lastIncident?.advice && (
            <div className="w-full bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 mb-8 text-left">
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">คำแนะนำความปลอดภัย</p>
               <p className="text-sm font-bold text-blue-800 italic leading-relaxed">"{lastIncident.advice}"</p>
            </div>
          )}
          <button onClick={() => setShowSuccess(false)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all">กลับสู่หน้าหลัก</button>
        </div>
      </Layout>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen font-['Kanit']">
      {view === 'citizen' && (
        <Layout title="Digital Lifeline" isAuthenticated={isAuthenticated} onToggleView={toggleView}>
          {isSubmitting && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white p-6">
              <div className="w-20 h-20 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-2xl font-black mb-2 uppercase">Processing</p>
              <p className="text-sm opacity-80 font-medium text-center">{submitStep}</p>
            </div>
          )}
          <div className="bg-gradient-to-r from-[#d32f2f] to-[#1a237e] p-4 text-white flex justify-between items-center shadow-lg">
            <div className="flex flex-col">
              <p className="text-[9px] font-black uppercase mb-0.5 tracking-[0.2em] opacity-80">EMERGENCY RESPONSE</p>
              <p className="text-xs text-white/90 font-bold uppercase">Nong Thum Digital Lifeline</p>
            </div>
          </div>
          <IncidentForm onSubmit={handleReportSubmit} isSubmitting={isSubmitting} />
        </Layout>
      )}
      {view === 'login' && <Layout title="Staff Login" onToggleView={toggleView}><LoginForm onLogin={(s) => { if(s){setIsAuthenticated(true); localStorage.setItem('officer_session', 'active'); setView('admin');} }} onCancel={() => setView('citizen')} /></Layout>}
      {view === 'admin' && (
        <Layout title="Command Center" isAdmin isAuthenticated={isAuthenticated} onToggleView={toggleView}>
          <AdminDashboard 
            incidents={incidents} 
            onUpdateStatus={handleUpdateStatus} 
            onLogout={handleLogout}
            settings={settings}
            onUpdateSettings={(s) => setSettings(prev => ({...prev, ...s}))}
          />
        </Layout>
      )}
    </div>
  );
};

export default App;
