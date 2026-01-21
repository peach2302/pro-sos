import React, { useState, useRef } from 'react';
import { IncidentType, Location } from '../types';

interface IncidentFormProps {
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

const IncidentForm: React.FC<IncidentFormProps> = ({ onSubmit, isSubmitting }) => {
  const [type, setType] = useState<IncidentType>(IncidentType.FIRE);
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `ความแม่นยำ +/- ${Math.round(position.coords.accuracy)} เมตร`
          });
          setIsLocating(false);
        },
        (error) => {
          setIsLocating(false);
          let msg = "ไม่สามารถระบุพิกัดได้";
          if (error.code === 1) msg = "กรุณาเปิดการอนุญาตเข้าถึง GPS";
          else if (error.code === 2) msg = "สัญญาณ GPS อ่อน กรุณาลองใหม่ในที่โล่ง";
          alert(msg);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else {
      alert("อุปกรณ์ของคุณไม่รองรับการระบุพิกัด");
      setIsLocating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(base64);
          setMediaPreview(compressed);
        } else {
          setMediaPreview(base64);
        }
        setMediaFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      alert("กรุณาระบุตำแหน่งที่เกิดเหตุผ่านปุ่ม 'ส่งพิกัด GPS'");
      return;
    }
    onSubmit({
      type,
      description,
      reporterName,
      phone,
      location,
      mediaUrl: mediaPreview,
      mediaType: mediaFile?.type.startsWith('video') ? 'video' : 'image',
      createdAt: Date.now()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="px-5 pt-6 pb-36 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex flex-col space-y-1">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">แบบฟอร์มแจ้งเหตุฉุกเฉิน</h2>
        <p className="text-xs text-slate-500 font-medium">กรุณาแจ้งข้อมูลตามความเป็นจริงเพื่อความรวดเร็วในการช่วยเหลือ</p>
      </div>

      {/* 1. Incident Type */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 px-1">
          <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</div>
          <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">ประเภทเหตุฉุกเฉิน</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(IncidentType).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`relative py-6 px-2 rounded-3xl border-2 transition-all flex flex-col items-center justify-center space-y-2 overflow-hidden ${
                type === t 
                  ? 'bg-red-50 border-red-500 text-red-700 shadow-lg scale-[1.02]' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              <span className="text-3xl filter drop-shadow-sm">
                {t === IncidentType.FIRE && '🔥'}
                {t === IncidentType.ACCIDENT && '🚑'}
                {t === IncidentType.SICK && '🏥'}
                {t === IncidentType.ANIMAL && '🐍'}
                {t === IncidentType.OTHER && '🚨'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {t === IncidentType.FIRE && 'เพลิงไหม้'}
                {t === IncidentType.ACCIDENT && 'อุบัติเหตุ'}
                {t === IncidentType.SICK && 'กู้ชีพ/ป่วย'}
                {t === IncidentType.ANIMAL && 'สัตว์มีพิษ'}
                {t === IncidentType.OTHER && 'เหตุอื่นๆ'}
              </span>
              {type === t && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-bl-xl">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Media Capture */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 px-1">
          <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</div>
          <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">ภาพถ่าย/วิดีโอ (ถ้ามี)</label>
        </div>
        <input type="file" accept="image/*,video/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        {mediaPreview ? (
          <div className="group relative rounded-[2rem] overflow-hidden bg-black aspect-video border-2 border-slate-100 shadow-xl">
            {mediaFile?.type.startsWith('video') ? (
              <video src={mediaPreview} className="w-full h-full object-cover" controls />
            ) : (
              <img src={mediaPreview} className="w-full h-full object-cover" alt="Evidence" />
            )}
            <button type="button" onClick={() => { setMediaPreview(null); setMediaFile(null); }} className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-red-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50 flex flex-col items-center justify-center space-y-3 text-slate-400 hover:bg-red-50 hover:border-red-200 transition-all active:scale-98"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md text-red-500 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <span className="font-bold text-xs uppercase tracking-[0.2em]">เปิดกล้องถ่ายภาพ</span>
          </button>
        )}
      </section>

      {/* 3. Details & Contact */}
      <section className="space-y-6 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">3</div>
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">รายละเอียด & การติดต่อ</label>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">รายละเอียดเหตุการณ์</label>
              <textarea 
                required 
                rows={3} 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="ระบุสิ่งที่เกิดขึ้น (เช่น ไฟไหม้หน้าบ้าน เลขที่...)" 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all placeholder:text-slate-300 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ชื่อ-นามสกุล ผู้แจ้ง</label>
                <input 
                  required 
                  type="text" 
                  value={reporterName} 
                  onChange={(e) => setReporterName(e.target.value)} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all shadow-sm" 
                  placeholder="ชื่อของท่าน" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">เบอร์โทรศัพท์ติดต่อกลับ</label>
                <input 
                  required 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-mono focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all shadow-sm" 
                  placeholder="08XXXXXXXX" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Location */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 px-1">
          <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">4</div>
          <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">ตำแหน่งเกิดเหตุ</label>
        </div>
        
        <button 
          type="button" 
          onClick={handleGetLocation} 
          disabled={isLocating} 
          className={`group w-full py-8 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden shadow-md active:scale-98 ${
            location ? 'border-green-500 bg-green-50 text-green-700' : 'border-dashed border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {isLocating && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${location ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600 animate-subtle-pulse'}`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            </div>
            <span className="font-black text-lg uppercase tracking-tight">{location ? 'ระบุพิกัดสำเร็จ' : 'กดส่งพิกัด GPS'}</span>
          </div>
          {location && (
            <div className="mt-3 px-4 py-1.5 bg-white/50 backdrop-blur-sm rounded-full border border-green-200 text-[10px] font-bold tracking-tight">
              {location.address}
            </div>
          )}
        </button>
      </section>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-40 max-w-md mx-auto rounded-t-[3rem] shadow-2xl">
        <button 
          type="submit" 
          disabled={isSubmitting || isLocating} 
          className={`w-full py-5 rounded-[2rem] font-black text-xl text-white shadow-[0_20px_40px_-10px_rgba(220,38,38,0.5)] transition-all active:scale-95 flex items-center justify-center space-x-3 ${
            isSubmitting || isLocating ? 'bg-slate-300 shadow-none' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span className="text-2xl">🚨</span>
              <span>ยืนยันแจ้งเหตุทันที</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default IncidentForm;