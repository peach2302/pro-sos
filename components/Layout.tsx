
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onToggleView?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, title, isAdmin = false, isAuthenticated = false, onToggleView }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto shadow-2xl bg-white relative">
      <header className={`p-4 text-white flex items-center justify-between sticky top-0 z-50 transition-colors duration-300 ${isAdmin ? 'bg-[#1a237e] shadow-lg' : 'bg-[#d32f2f] shadow-lg'}`}>
        <div className="flex items-center space-x-3 overflow-hidden">
          {/* Digital Lifeline Logo SVG Recreation */}
          <div className="bg-white p-1 rounded-xl shadow-inner flex items-center justify-center overflow-hidden w-12 h-12 shrink-0">
             <svg viewBox="0 0 100 100" className="w-full h-full">
               {/* Background Split Red-Blue */}
               <rect x="0" y="0" width="100" height="100" rx="25" fill="#d32f2f" />
               <path d="M50 0 L100 0 L100 100 L50 100 Z" fill="#1a237e" />
               
               {/* Bell Silhouette */}
               <path d="M50 20 C40 20 32 28 32 38 L32 55 L28 60 C26 62 27 65 30 65 L70 65 C73 65 74 62 72 60 L68 55 L68 38 C68 28 60 20 50 20 Z" fill="white" />
               <circle cx="50" cy="68" r="5" fill="white" />
               
               {/* Heartbeat Line (Red) */}
               <path d="M25 50 H42 L45 40 L50 60 L55 35 L60 55 L63 50 H75" fill="none" stroke="#d32f2f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
               
               {/* Signal Waves (Blue) */}
               <path d="M72 25 A15 15 0 0 1 85 45" fill="none" stroke="#4fc3f7" strokeWidth="3" strokeLinecap="round" />
               <path d="M65 30 A8 8 0 0 1 72 40" fill="none" stroke="#4fc3f7" strokeWidth="3" strokeLinecap="round" />
               <circle cx="60" cy="40" r="2.5" fill="#4fc3f7" />
             </svg>
          </div>
          <div className="flex flex-col truncate">
            <h1 className="font-black text-base leading-tight tracking-tight uppercase truncate">DIGITAL LIFELINE</h1>
            <span className="text-[10px] text-white/90 font-medium tracking-wide">ระบบแจ้งเหตุทันที อบต.หนองทุ่ม</span>
          </div>
        </div>
        
        {onToggleView && (
          <button 
            onClick={onToggleView}
            className={`p-2.5 rounded-2xl border transition-all active:scale-90 shadow-md flex items-center justify-center ${
              isAdmin 
                ? 'bg-white/20 border-white/30 hover:bg-white/40' 
                : isAuthenticated 
                  ? 'bg-white/20 border-white/30 hover:bg-white/40' 
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
            }`}
          >
            {isAuthenticated ? (
              isAdmin ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            )}
          </button>
        )}
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
};

export default Layout;
