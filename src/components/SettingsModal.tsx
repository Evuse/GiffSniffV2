import { X, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSessionId: string;
  onSave: (sessionId: string) => void;
  lang: 'en' | 'it';
  dict: Record<string, any>;
}

export default function SettingsModal({ isOpen, onClose, initialSessionId, onSave, lang, dict }: SettingsModalProps) {
  const [localSessionId, setLocalSessionId] = useState(initialSessionId);
  const t = dict[lang];

  useEffect(() => {
    setLocalSessionId(initialSessionId);
  }, [initialSessionId, isOpen]);

  const handleSave = () => {
    onSave(localSessionId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }} 
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="bg-white/80 dark:bg-[#070b14]/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5 dark:from-cyan-500/10 dark:to-fuchsia-500/10 pointer-events-none" />
            
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-500/20 rounded-xl text-cyan-600 dark:text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-widest">{t.settings}</h3>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 relative z-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-cyan-50 uppercase tracking-widest mb-3">
                    Instagram <code className="text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded ml-1 text-slate-800 dark:text-cyan-400">sessionid</code>
                  </label>
                  <input
                    type="password"
                    value={localSessionId}
                    onChange={(e) => setLocalSessionId(e.target.value)}
                    placeholder="eyJhb..."
                    className="w-full px-5 py-4 bg-white dark:bg-black border border-slate-300 dark:border-white/10 rounded-2xl text-slate-800 dark:text-cyan-50 placeholder:text-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all shadow-inner"
                  />
                </div>

                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 text-sm text-slate-700 dark:text-cyan-50 font-mono relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                  <p className="opacity-80 pt-1 pb-4 text-xs font-bold leading-relaxed uppercase overflow-hidden relative z-10 text-cyan-700 dark:text-cyan-300">
                    [INFO] {lang === 'en' ? 'Extraction via personal token reduces 401 Unauthorized errors.' : "L'estrazione tramite token personale riduce gli errori 401 Unauthorized."}
                  </p>
                  <ol className="list-decimal pl-5 space-y-2.5 opacity-80 text-[10px] uppercase font-bold tracking-widest relative z-10 text-slate-600 dark:text-slate-400">
                    {lang === 'en' ? (
                       <>
                         <li>Login at instagram.com</li>
                         <li>Open DevTools (F12)</li>
                         <li>Application {">"} Cookies {">"} instagram.com</li>
                         <li>Copy [sessionid] value</li>
                       </>
                    ) : (
                       <>
                         <li>Accedi a instagram.com</li>
                         <li>Apri DevTools (F12)</li>
                         <li>App {">"} Cookie {">"} instagram.com</li>
                         <li>Copia valore [sessionid]</li>
                       </>
                    )}
                  </ol>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-slate-50/50 dark:bg-black/30 border-t border-slate-200/50 dark:border-white/5 flex justify-end gap-4 relative z-10">
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/30 transition-all active:scale-95"
              >
                {t.save || 'Save'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
