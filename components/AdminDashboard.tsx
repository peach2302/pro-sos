
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IncidentReport, IncidentStatus, IncidentType } from '../types';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import { NotificationSettings } from '../App';

interface AdminDashboardProps {
  incidents: IncidentReport[];
  onUpdateStatus: (id: string, status: IncidentStatus, closingMediaUrl?: string, officerName?: string, officerPosition?: string, signatureUrl?: string) => void;
  onLogout: () => void;
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: Partial<NotificationSettings>) => void;
}

type TabType = 'new' | 'active' | 'history' | 'summary';

interface Toast {
  id: string;
  message: string;
  type: IncidentType;
  incidentId: string;
  brief: string;
  severity: string;
}

// --- Signature Pad Component ---
const SignaturePad: React.FC<{ onSave: (data: string) => void, onClear: () => void }> = ({ onSave, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
    ctx?.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      // Small delay to ensure stroke finish
      setTimeout(() => {
        onSave(canvas.toDataURL('image/png'));
      }, 50);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onClear();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ลงลายมือชื่อเจ้าหน้าที่</label>
        <button type="button" onClick={clear} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">ล้าง</button>
      </div>
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] overflow-hidden h-40 relative touch-none shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
        {!isDrawing && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"><p className="text-xs font-bold text-slate-400">ลงชื่อในบริเวณนี้</p></div>}
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  incidents, 
  onUpdateStatus, 
  onLogout,
  settings,
  onUpdateSettings
}) => {
  const [confirmData, setConfirmData] = useState<{ id: string; status: IncidentStatus; type: IncidentType } | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [closingImage, setClosingImage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [officerPosition, setOfficerPosition] = useState('');
  
  const notifiedIds = useRef<Set<string>>(new Set(incidents.map(i => i.id)));
  const audioContextRef = useRef<AudioContext | null>(null);

  const stats = useMemo(() => ({
    pending: incidents.filter(i => i.status === IncidentStatus.PENDING).length,
    active: incidents.filter(i => i.status === IncidentStatus.IN_PROGRESS).length,
    resolved: incidents.filter(i => i.status === IncidentStatus.RESOLVED).length,
  }), [incidents]);

  const chartData = [
    { name: 'รอรับเรื่อง', value: stats.pending, color: '#EF4444' },
    { name: 'ปฏิบัติงาน', value: stats.active, color: '#F59E0B' },
    { name: 'สำเร็จ', value: stats.resolved, color: '#10B981' },
  ];

  const initAudio = async () => {
    if (isAudioReady) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      setIsAudioReady(true);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const events = ['click', 'touchstart', 'mousedown'];
    const handler = () => { initAudio(); events.forEach(e => window.removeEventListener(e, handler)); };
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, []);

  useEffect(() => {
    incidents.forEach(incident => {
      if (incident.status === IncidentStatus.PENDING && !notifiedIds.current.has(incident.id)) {
        notifiedIds.current.add(incident.id);
        const toastId = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [{ 
          id: toastId, message: '🚨 แจ้งเหตุใหม่!', type: incident.type, incidentId: incident.id,
          brief: incident.description.substring(0, 40) + '...', severity: incident.severity || 'MEDIUM'
        }, ...prev]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 10000);
        if (settings.soundEnabled && isAudioReady) {
           const ctx = audioContextRef.current!;
           const osc = ctx.createOscillator();
           const gain = ctx.createGain();
           osc.frequency.setValueAtTime(880, ctx.currentTime);
           gain.gain.setValueAtTime(0.3, ctx.currentTime);
           gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
           osc.connect(gain); gain.connect(ctx.destination);
           osc.start(); osc.stop(ctx.currentTime + 1);
        }
      }
    });
  }, [incidents]);

  const handleStatusClick = (e: React.MouseEvent, id: string, status: IncidentStatus, type: IncidentType) => {
    e.stopPropagation();
    const inc = incidents.find(i => i.id === id);
    setOfficerName(inc?.officerName || '');
    setOfficerPosition(inc?.officerPosition || '');
    setConfirmData({ id, status, type });
    setClosingImage(null);
    setSignature(null);
  };

  const confirmUpdate = async () => {
    if (!confirmData) return;
    if (!officerName.trim() || !officerPosition.trim()) { alert("กรุณาระบุชื่อและตำแหน่งเจ้าหน้าที่"); return; }
    if (confirmData.status === IncidentStatus.RESOLVED) {
      if (!closingImage) { alert("กรุณาถ่ายภาพสรุปหน้างาน"); return; }
      if (!signature) { alert("กรุณาลงลายมือชื่อเจ้าหน้าที่"); return; }
    }
    
    setIsSubmitting(true);
    try {
      await onUpdateStatus(confirmData.id, confirmData.status, closingImage || undefined, officerName, officerPosition, signature || undefined);
      setConfirmData(null);
      setSelectedIncident(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (activeTab === 'new') return inc.status === IncidentStatus.PENDING;
    if (activeTab === 'active') return inc.status === IncidentStatus.IN_PROGRESS;
    if (activeTab === 'history') return inc.status === IncidentStatus.RESOLVED || inc.status === IncidentStatus.CANCELLED;
    return false;
  });

  const formatDate = (ts: number) => new Date(ts).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

  return (
    <div className="p-4 space-y-6 bg-slate-100 min-h-screen relative pb-24">
      {/* Toast Overlay */}
      <div className="fixed top-24 left-4 right-4 z-[999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-red-600 text-white p-5 rounded-[2rem] shadow-2xl flex items-center space-x-4 animate-in slide-in-from-top-12 duration-500 pointer-events-auto border-4 border-white/20">
            <div className="p-3 bg-white text-red-600 rounded-2xl shadow-lg">🚨</div>
            <div className="flex-1 overflow-hidden">
              <p className="font-black text-sm uppercase">เหตุใหม่: {t.incidentId}</p>
              <p className="text-[10px] font-bold opacity-80 truncate">{t.brief}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl border-2 border-slate-800">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Command Center</p>
          <p className="text-xl font-black tracking-tighter uppercase">Nong Thum Rescue</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${isAudioReady ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-amber-500/10 border-amber-500 text-amber-500 animate-pulse'}`}>
          {isAudioReady ? 'Audio LIVE' : 'Audio Pending'}
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex p-2 bg-white rounded-[2.5rem] shadow-sm sticky top-4 z-40 border border-slate-200/50 backdrop-blur-md">
        {['new', 'active', 'history', 'summary'].map(id => (
          <button 
            key={id} 
            onClick={() => setActiveTab(id as TabType)}
            className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-400'}`}
          >
            {id === 'new' ? 'รอรับเรื่อง' : id === 'active' ? 'กำลังทำ' : id === 'history' ? 'สำเร็จ' : 'สรุป'}
          </button>
        ))}
      </nav>

      {/* Content */}
      {activeTab === 'summary' ? (
        <section className="bg-white p-8 rounded-[3.5rem] shadow-xl space-y-10 animate-in fade-in">
          <h3 className="text-3xl font-black text-slate-800 text-center tracking-tighter">สรุปข้อมูลประจำวัน</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <Bar dataKey="value" barSize={50} radius={[15, 15, 15, 15]}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3">
             {chartData.map(d => (
               <div key={d.name} className="p-4 rounded-[2rem] text-center bg-slate-50 border border-slate-100 shadow-sm">
                  <p className="text-2xl font-black" style={{color: d.color}}>{d.value}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{d.name}</p>
               </div>
             ))}
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {filteredIncidents.map(inc => (
            <div 
              key={inc.id} 
              onClick={() => setSelectedIncident(inc)}
              className="bg-white p-7 rounded-[3.5rem] shadow-xl border border-slate-50 relative group active:scale-[0.98] transition-all hover:shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  inc.status === IncidentStatus.PENDING ? 'bg-red-500 text-white animate-pulse' : 
                  inc.status === IncidentStatus.IN_PROGRESS ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'
                }`}>
                  {inc.status === IncidentStatus.PENDING ? '🚨 ใหม่' : inc.status === IncidentStatus.IN_PROGRESS ? '🚑 กำลังไป' : '✅ สำเร็จ'}
                </span>
                <span className="text-[11px] font-black text-slate-300">#{inc.id}</span>
              </div>
              <div className="flex items-center space-x-5 mb-5">
                 <div className="text-5xl drop-shadow-lg">{inc.type === IncidentType.FIRE ? '🔥' : inc.type === IncidentType.ACCIDENT ? '🚑' : inc.type === IncidentType.SICK ? '🏥' : '🚨'}</div>
                 <div>
                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{inc.type}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(inc.createdAt)}</p>
                 </div>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2 italic bg-slate-50 p-5 rounded-[2rem] border border-slate-100">"{inc.description}"</p>
              <div className="flex justify-between items-center pt-5 border-t border-slate-50 mt-5">
                 <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ผู้แจ้ง</p>
                    <p className="text-sm font-black text-slate-800">{inc.reporterName}</p>
                 </div>
                 <div className="flex space-x-2">
                    {inc.status === IncidentStatus.PENDING && (
                      <button onClick={(e) => handleStatusClick(e, inc.id, IncidentStatus.IN_PROGRESS, inc.type)} className="bg-indigo-600 text-white px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">รับเรื่อง</button>
                    )}
                    {inc.status === IncidentStatus.IN_PROGRESS && (
                      <button onClick={(e) => handleStatusClick(e, inc.id, IncidentStatus.RESOLVED, inc.type)} className="bg-green-600 text-white px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">ปิดงาน</button>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedIncident(null)}>
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in max-h-[90vh] overflow-y-auto relative border-8 border-white" onClick={(e) => e.stopPropagation()}>
            <div className={`p-10 text-white relative ${selectedIncident.status === IncidentStatus.PENDING ? 'bg-red-600' : 'bg-indigo-600'}`}>
              <button onClick={() => setSelectedIncident(null)} className="absolute top-8 right-8 p-4 bg-white/20 rounded-2xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg></button>
              <h2 className="text-4xl font-black tracking-tighter mb-4">#{selectedIncident.id}</h2>
              <div className="flex items-center space-x-5">
                 <span className="text-6xl">{selectedIncident.type === IncidentType.FIRE ? '🔥' : '🚑'}</span>
                 <p className="text-3xl font-black tracking-tight uppercase">{selectedIncident.type}</p>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-6 rounded-[2.5rem]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ผู้แจ้งเหตุ</p>
                    <p className="text-lg font-black text-slate-800">{selectedIncident.reporterName}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-[2.5rem]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เบอร์ติดต่อ</p>
                    <p className="text-lg font-black text-indigo-600">{selectedIncident.phone}</p>
                 </div>
              </div>
              <p className="text-xl font-bold text-slate-700 italic bg-slate-50 p-6 rounded-[2.5rem]">"{selectedIncident.description}"</p>
              <a href={`https://www.google.com/maps?q=${selectedIncident.location.lat},${selectedIncident.location.lng}`} target="_blank" rel="noopener noreferrer" className="w-full py-6 bg-slate-900 text-white rounded-[2.8rem] font-black text-sm uppercase flex items-center justify-center space-x-4 shadow-xl active:scale-95 transition-all">
                <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                <span>เปิดแผนที่นำทาง</span>
              </a>
              {selectedIncident.mediaUrl && (
                <div className="rounded-[3.5rem] overflow-hidden shadow-2xl aspect-video bg-black border-4 border-slate-50">
                  {selectedIncident.mediaType === 'video' ? <video src={selectedIncident.mediaUrl} className="w-full h-full object-cover" controls /> : <img src={selectedIncident.mediaUrl} className="w-full h-full object-cover" />}
                </div>
              )}
              {selectedIncident.officerName && (
                <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">เจ้าหน้าที่ผู้ปฏิบัติงาน</p>
                   <p className="text-2xl font-black text-slate-800">{selectedIncident.officerName}</p>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedIncident.officerPosition}</p>
                   {selectedIncident.signatureUrl && (
                     <div className="mt-4 border-t border-slate-200 pt-4 text-center">
                        <img src={selectedIncident.signatureUrl} alt="Signature" className="h-20 mx-auto object-contain filter contrast-125" />
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Digital Signature</p>
                     </div>
                   )}
                   {selectedIncident.closingMediaUrl && (
                     <div className="mt-6 space-y-2 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ภาพถ่ายสรุปผลการปฏิบัติงาน</p>
                        <div className="rounded-3xl overflow-hidden border-4 border-white shadow-lg">
                          <img src={selectedIncident.closingMediaUrl} alt="Closing Evidence" className="w-full h-full object-cover" />
                        </div>
                     </div>
                   )}
                </div>
              )}
              <div className="flex flex-col space-y-3">
                 {selectedIncident.status === IncidentStatus.PENDING && (
                    <button onClick={(e) => handleStatusClick(e, selectedIncident.id, IncidentStatus.IN_PROGRESS, selectedIncident.type)} className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xl shadow-xl">รับเรื่องปฏิบัติงาน</button>
                 )}
                 {selectedIncident.status === IncidentStatus.IN_PROGRESS && (
                    <button onClick={(e) => handleStatusClick(e, selectedIncident.id, IncidentStatus.RESOLVED, selectedIncident.type)} className="w-full py-6 bg-green-600 text-white rounded-[2.5rem] font-black text-xl shadow-xl">ภารกิจเสร็จสิ้น</button>
                 )}
                 <button onClick={() => setSelectedIncident(null)} className="w-full py-5 bg-slate-100 text-slate-500 rounded-[2.5rem] font-black text-sm uppercase">ปิดหน้าต่าง</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal with Signature Pad and Image Capture */}
      {confirmData && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] p-10 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-slate-800 mb-8 text-center uppercase tracking-tighter">
              {confirmData.status === IncidentStatus.IN_PROGRESS ? 'ยืนยันรับเรื่อง' : 'ยืนยันการปิดงาน'}
            </h3>
            <div className="space-y-6 mb-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">ข้อมูลเจ้าหน้าที่</label>
                <input type="text" value={officerName} onChange={e => setOfficerName(e.target.value)} placeholder="ชื่อ-นามสกุล" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none" />
                <input type="text" value={officerPosition} onChange={e => setOfficerPosition(e.target.value)} placeholder="ตำแหน่งเจ้าหน้าที่" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none mt-2" />
              </div>
              {confirmData.status === IncidentStatus.RESOLVED && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">รูปถ่ายสรุปหน้างาน</label>
                    <input type="file" capture="environment" id="final-pic-input" className="hidden" onChange={e => {
                       const f = e.target.files?.[0];
                       if(f){ const r = new FileReader(); r.onloadend = () => setClosingImage(r.result as string); r.readAsDataURL(f); }
                    }} />
                    <label htmlFor="final-pic-input" className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 cursor-pointer overflow-hidden hover:bg-indigo-50 transition-colors">
                       {closingImage ? <img src={closingImage} className="w-full h-full object-cover" /> : <div className="text-center"><svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[10px] font-black uppercase tracking-widest">แตะเพื่อถ่ายรูปสรุปงาน</span></div>}
                    </label>
                  </div>
                  <SignaturePad onSave={setSignature} onClear={() => setSignature(null)} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmData(null)} className="py-6 bg-slate-100 text-slate-500 rounded-[2.5rem] font-black uppercase text-xs">ยกเลิก</button>
              <button onClick={confirmUpdate} disabled={isSubmitting} className="py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">
                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Float Actions */}
      <div className="fixed bottom-10 right-8 z-[60] flex flex-col space-y-4">
        <button onClick={() => setShowSettings(true)} className="bg-indigo-600 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white border-4 border-white active:scale-90 transition-transform">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        <button onClick={onLogout} className="bg-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-red-500 border-4 border-slate-50 active:scale-90 transition-transform">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
