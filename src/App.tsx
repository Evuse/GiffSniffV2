import { useState, useEffect } from 'react';
import { 
  Settings, Download, Film, Image as ImageIcon, Link, Loader2, Info, Check, 
  Menu, X, Moon, Sun, LayoutDashboard, Languages, ShieldAlert, Cpu, Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SettingsModal from './components/SettingsModal';

const dict = {
  en: {
    dashboard: "Dashboard",
    settings: "Config",
    theme: "Theme",
    lang: "Language",
    title: "GIF Sniffer",
    subtitle: "Advanced media extraction protocol. Target Pinterest & Instagram nodes.",
    urlLabel: "Target URL Endpoint",
    urlPlaceholder: "https://instagram.com/p/... or https://pinterest.com/...",
    settingsTitle: "Extraction Parameters",
    fmtVid: "Video Stream",
    fmtGif: "Animation Matrix",
    fmtImg: "Static Frame",
    btnExtract: "Initialize Extraction",
    btnLoading: "Bypassing firewalls...",
    btnSuccess: "Payload Downloaded",
    noticeTitle: "Authentication Notice",
    noticeText: "Instagram node requires valid Session ID to bypass rate limits and access private payloads. Credential packets remain local.",
    btnConfig: "Configure Access Token",
    errEmpty: "Provide a valid target URL.",
    vQualOriginal: "Original Stream",
    vQualHigh: "High-Res Re-encode",
    vQualMed: "Standard Resolution",
    vQualLow: "Bandwidth Saver",
    iQualOriginal: "Raw Binary",
    iQualHigh: "Lossless Compression",
    iQualMed: "Standard Compression",
    iQualLow: "High Compression",
    cancel: "Abort",
    save: "Deploy Config",
  },
  it: {
    dashboard: "Pannello",
    settings: "Configurazione",
    theme: "Tema",
    lang: "Lingua",
    title: "GIF Sniffer",
    subtitle: "Protocollo estrazione avanzata. Target: nodi Pinterest e Instagram.",
    urlLabel: "Endpoint URL Target",
    urlPlaceholder: "https://instagram.com/p/... o https://pinterest.com/...",
    settingsTitle: "Parametri Estrazione",
    fmtVid: "Flusso Video",
    fmtGif: "Matrice Animazione",
    fmtImg: "Frame Statico",
    btnExtract: "Inizializza Estrazione",
    btnLoading: "Bypass dei firewall...",
    btnSuccess: "Payload Scaricato",
    noticeTitle: "Avviso Autenticazione",
    noticeText: "Il nodo Instagram richiede un Session ID valido per superare i limiti di rate e decrittografare payload privati. I token rimangono nel client locale.",
    btnConfig: "Configura Token di Accesso",
    errEmpty: "Fornire un URL target valido.",
    vQualOriginal: "Flusso Originale",
    vQualHigh: "Alta Risoluzione",
    vQualMed: "Risoluzione Standard",
    vQualLow: "Risparmio Banda",
    iQualOriginal: "Binario Grezzo",
    iQualHigh: "Compressione Lossless",
    iQualMed: "Compressione Standard",
    iQualLow: "Alta Compressione",
    cancel: "Annulla",
    save: "Salva Config",
  }
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  
  const [lang, setLang] = useState<'en' | 'it'>(() => {
    return (localStorage.getItem('lang') as 'en' | 'it') || 'it';
  });

  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp4' | 'gif' | 'image'>('mp4');
  
  // Settings
  const [mp4Quality, setMp4Quality] = useState<'original' | 'high' | 'medium' | 'low'>('original');
  const [mp4Width, setMp4Width] = useState<number>(0);
  const [mp4Fps, setMp4Fps] = useState<number>(0);

  const [gifWidth, setGifWidth] = useState(480);
  const [gifFps, setGifFps] = useState(15);
  const [gifColors, setGifColors] = useState(256);
  const [gifDither, setGifDither] = useState<'sierra2_4a' | 'bayer' | 'none'>('sierra2_4a');

  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageQuality, setImageQuality] = useState<'original' | 'high' | 'medium' | 'low'>('original');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [igSessionId, setIgSessionId] = useState(() => localStorage.getItem('ig_sessionid') || '');
  const [extractedCache, setExtractedCache] = useState<{ url: string, videoUrl: string, title: string } | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  const toggleLang = () => {
    const newLang = lang === 'en' ? 'it' : 'en';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = dict[lang];

  const handleDownload = async () => {
    if (!url) {
      setError(t.errEmpty);
      return;
    }
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      let finalVideoUrl = '';
      let finalTitle = '';

      if (extractedCache && extractedCache.url === url) {
        finalVideoUrl = extractedCache.videoUrl;
        finalTitle = extractedCache.title;
      } else {
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, sessionid: igSessionId })
        });

        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error || 'Extraction failed');

        finalVideoUrl = extractData.videoUrl;
        finalTitle = extractData.title;
        setExtractedCache({ url, videoUrl: finalVideoUrl, title: finalTitle });
      }

      const settings = format === 'gif' 
        ? { width: gifWidth, fps: gifFps, colors: gifColors, dither: gifDither } 
        : format === 'image'
        ? { quality: imageQuality, width: imageWidth }
        : { quality: mp4Quality, width: mp4Width, fps: mp4Fps };

      const downloadRes = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: finalVideoUrl,
          title: finalTitle,
          format: format,
          settings: settings
        })
      });

      if (!downloadRes.ok) {
        const errorData = await downloadRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Download sequence failed');
      }

      const blob = await downloadRes.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      const extension = format === 'gif' ? 'gif' : format === 'image' ? 'jpg' : 'mp4';
      const filename = `${finalTitle || 'payload'}.${extension}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      setError(err.message || 'Unknown network anomaly');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIgSession = (value: string) => {
    setIgSessionId(value);
    localStorage.setItem('ig_sessionid', value);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-cyan-50 font-sans flex overflow-hidden transition-colors duration-500 selection:bg-cyan-500/30 relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 dark:bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/10 dark:bg-fuchsia-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-blue-500/5 dark:bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.06] mix-blend-overlay" />
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white/60 dark:bg-[#080d19]/60 backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 pt-8 z-20 shadow-2xl transition-all duration-300">
        <div className="px-8 mb-10 flex items-center gap-4">
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-fuchsia-500 blur-md opacity-40 dark:opacity-60 rounded-xl animate-pulse" />
             <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-cyan-950 dark:to-blue-950 p-2.5 rounded-xl border border-white/10 shadow-xl">
               <Cpu className="w-6 h-6 text-cyan-400" />
             </div>
          </div>
          <div>
             <h1 className="font-black text-xl tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">
               GIF SNIFFER
             </h1>
             <p className="text-[9px] font-mono font-bold tracking-widest text-slate-400 text-cyan-600/60 uppercase">Extraction Protocol</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-3">
          <button className="w-full relative overflow-hidden group flex items-center gap-4 px-5 py-4 bg-white dark:bg-white/5 text-cyan-700 dark:text-cyan-300 rounded-2xl border border-cyan-200/50 dark:border-white/10 font-medium transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_8px_30px_rgb(6,182,212,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-fuchsia-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-out" />
            <LayoutDashboard className="w-5 h-5 relative z-10" />
            <span className="relative z-10 font-bold tracking-wide">{t.dashboard}</span>
          </button>
          
          <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-4 px-5 py-4 text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-cyan-300 rounded-2xl transition-all border border-transparent font-medium">
            <ShieldAlert className="w-5 h-5" />
            <span className="tracking-wide">{t.settings}</span>
          </button>
        </nav>
        
        <div className="p-4 mx-4 mb-4 border border-slate-200/50 dark:border-white/10 rounded-3xl bg-white/40 dark:bg-black/20 backdrop-blur-lg space-y-1">
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-2xl transition-all"
          >
            <span>{t.theme}</span>
            <div className="p-1.5 rounded-lg bg-slate-200/50 dark:bg-white/10 border border-slate-300/50 dark:border-white/5">
               {theme === 'dark' ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-orange-500" />}
            </div>
          </button>
          
          <button 
            onClick={toggleLang}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-2xl transition-all"
          >
            <span>{t.lang}</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-200/50 dark:bg-white/10 border border-slate-300/50 dark:border-white/5 uppercase text-[10px] font-black tracking-wider">
               <Languages className="w-3 h-3" />
               {lang}
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 w-full scroll-smooth">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white/60 dark:bg-black/60 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-cyan-900 dark:to-blue-900 p-2 rounded-xl text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h1 className="font-black text-lg tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">GIF SNIFFER</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-cyan-50 font-bold text-xs uppercase hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
              {lang}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-cyan-50 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }} 
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="md:hidden fixed inset-0 z-20 bg-slate-900/20 dark:bg-black/60 top-[73px]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <motion.nav 
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: -10, opacity: 0 }}
                className="bg-white/95 dark:bg-[#080d19]/95 border-b border-slate-200/50 dark:border-white/10 px-4 py-4 space-y-2 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <button className="w-full flex items-center gap-3 px-4 py-4 bg-cyan-50/50 dark:bg-white/5 text-cyan-700 dark:text-cyan-300 rounded-2xl font-medium border border-cyan-200/50 dark:border-white/10 backdrop-blur-sm">
                  <LayoutDashboard className="w-5 h-5" />
                  {t.dashboard}
                </button>
                <button onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors font-medium">
                  <ShieldAlert className="w-5 h-5" />
                  {t.settings}
                </button>
                <div className="h-px w-full bg-slate-200/50 dark:bg-white/10 my-2" />
                <button onClick={toggleTheme} className="w-full flex justify-between items-center px-4 py-4 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors font-medium">
                  {t.theme}
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-orange-500" />}
                </button>
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 md:p-12 mb-20 relative z-0">
          
          <header className="mb-12 relative pt-4 sm:pt-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-sm">
                 <Terminal className="w-3.5 h-3.5" />
                 Ready Status
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1]">
              Payload<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-fuchsia-500 ml-2">Extraction</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium text-lg max-w-xl">{t.subtitle}</p>
          </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* PRIMARY CARDS (Left Side on Desktop) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Search / Input Card */}
                <div className="relative group bg-white/70 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200 dark:border-white/10 p-2 transition-all hover:bg-white/80 dark:hover:bg-white/[0.02]">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 dark:from-cyan-500/10 dark:to-fuchsia-500/10 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-xl" />
                  <div className="bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-xl rounded-[1.5rem] p-6 sm:p-10 relative z-10 border border-slate-100 dark:border-white/5">
                    <label htmlFor="url" className="flex items-center gap-3 text-sm font-black text-slate-800 dark:text-cyan-50 uppercase tracking-widest mb-6">
                      <div className="p-1.5 rounded-md bg-cyan-100 dark:bg-cyan-500/10 text-cyan-500">
                        <Link className="w-4 h-4" />
                      </div>
                      {t.urlLabel}
                    </label>
                    <div className="relative group shadow-sm rounded-2xl">
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-2xl blur opacity-20 dark:opacity-30 group-hover:opacity-40 transition duration-500" />
                      <input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                        placeholder={t.urlPlaceholder}
                        className="relative w-full px-6 py-5 bg-white dark:bg-[#0c1222] border-none rounded-2xl text-slate-800 dark:text-cyan-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-inner z-10 transition-all font-medium"
                      />
                    </div>
                    
                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-6 p-5 bg-red-50 dark:bg-rose-950/20 text-red-600 dark:text-rose-400 text-sm font-bold rounded-2xl border border-red-200/50 dark:border-rose-500/20 flex items-start gap-4">
                            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Output Settings Card */}
                <div className="bg-white/70 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200 dark:border-white/10 p-6 sm:p-10 transition-all">
                  <h3 className="text-sm font-black text-slate-800 dark:text-cyan-50 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-cyan-100 dark:bg-cyan-500/10 text-cyan-500">
                      <Settings className="w-4 h-4" />
                    </div>
                    {t.settingsTitle}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    <button
                      type="button"
                      onClick={() => setFormat('mp4')}
                      className={`group relative flex flex-col items-center justify-center p-6 border rounded-2xl transition-all duration-300 overflow-hidden ${
                        format === 'mp4' 
                          ? 'border-cyan-400/50 bg-cyan-50 dark:bg-cyan-900/20 shadow-[0_0_30px_rgba(6,182,212,0.15)] dark:shadow-[0_0_30px_rgba(6,182,212,0.1)] scale-[1.02]' 
                          : 'border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:border-cyan-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {format === 'mp4' && <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/10 to-transparent pointer-events-none" />}
                      <div className={`p-3 rounded-xl mb-4 transition-colors ${format === 'mp4' ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 group-hover:text-cyan-400'}`}>
                        <Film className="w-6 h-6 z-10" />
                      </div>
                      <span className={`font-black tracking-widest text-xs uppercase z-10 transition-colors ${format === 'mp4' ? 'text-cyan-800 dark:text-cyan-200' : 'text-slate-600 dark:text-slate-400'}`}>{t.fmtVid}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setFormat('gif')}
                      className={`group relative flex flex-col items-center justify-center p-6 border rounded-2xl transition-all duration-300 overflow-hidden ${
                        format === 'gif' 
                          ? 'border-fuchsia-400/50 bg-fuchsia-50 dark:bg-fuchsia-900/20 shadow-[0_0_30px_rgba(217,70,239,0.15)] dark:shadow-[0_0_30px_rgba(217,70,239,0.1)] scale-[1.02]' 
                          : 'border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:border-fuchsia-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {format === 'gif' && <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-400/10 to-transparent pointer-events-none" />}
                      <div className={`p-3 rounded-xl mb-4 transition-colors ${format === 'gif' ? 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 group-hover:text-fuchsia-400'}`}>
                         <div className="font-black text-xl tracking-tighter mt-[-2px] h-6 flex items-center">GIF</div>
                      </div>
                      <span className={`font-black tracking-widest text-xs uppercase z-10 transition-colors ${format === 'gif' ? 'text-fuchsia-800 dark:text-fuchsia-200' : 'text-slate-600 dark:text-slate-400'}`}>{t.fmtGif}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormat('image')}
                      className={`group relative flex flex-col items-center justify-center p-6 border rounded-2xl transition-all duration-300 overflow-hidden ${
                        format === 'image' 
                          ? 'border-emerald-400/50 bg-emerald-50 dark:bg-emerald-900/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] dark:shadow-[0_0_30px_rgba(16,185,129,0.1)] scale-[1.02]' 
                          : 'border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:border-emerald-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {format === 'image' && <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/10 to-transparent pointer-events-none" />}
                      <div className={`p-3 rounded-xl mb-4 transition-colors ${format === 'image' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-400'}`}>
                        <ImageIcon className="w-6 h-6 z-10" />
                      </div>
                      <span className={`font-black tracking-widest text-xs uppercase z-10 transition-colors ${format === 'image' ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-400'}`}>{t.fmtImg}</span>
                    </button>
                  </div>

                  {/* Advanced Options Grid */}
                  <div className="bg-slate-50 dark:bg-[#070b14]/50 border border-slate-200 dark:border-cyan-900/30 rounded-xl p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={format}
                        initial={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        exit={{ opacity: 0, filter: 'blur(4px)', y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 gap-8 relative z-10"
                      >
                        {format === 'mp4' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-cyan-600/70 uppercase tracking-widest">Q-Profile</label>
                              </div>
                              <div className="relative">
                                <select 
                                  value={mp4Quality} 
                                  onChange={e => setMp4Quality(e.target.value as any)}
                                  className="w-full appearance-none bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-cyan-800/80 text-slate-800 dark:text-cyan-50 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all cursor-pointer shadow-sm hover:border-cyan-400"
                                >
                                  <option value="original">{t.vQualOriginal}</option>
                                  <option value="high">{t.vQualHigh}</option>
                                  <option value="medium">{t.vQualMed}</option>
                                  <option value="low">{t.vQualLow}</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-cyan-600">▼</div>
                              </div>
                            </div>
                            <div className={mp4Quality === 'original' ? 'opacity-40 pointer-events-none transition-opacity' : 'transition-opacity'}>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-cyan-600/70 uppercase tracking-widest">Resolution Vector</label>
                                <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 text-xs font-mono rounded-md font-bold">
                                  {mp4Width === 0 ? "SOURCE" : `${mp4Width}px`}
                                </span>
                              </div>
                              <div className="relative pt-2">
                                <input 
                                  type="range" 
                                  min="0" max="1920" step="120"
                                  value={mp4Width} 
                                  onChange={e => setMp4Width(Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <div className="flex justify-between text-[10px] uppercase font-mono text-slate-400 mt-2 font-bold px-1">
                                  <span>0</span>
                                  <span>1920px</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {format === 'gif' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-fuchsia-600/70 uppercase tracking-widest">Max Width Bounds</label>
                                <span className="px-2 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-800 dark:text-fuchsia-300 text-xs font-mono rounded-md font-bold">
                                  {gifWidth}px
                                </span>
                              </div>
                              <div className="relative pt-2">
                                <input 
                                  type="range" 
                                  min="100" max="1080" step="20"
                                  value={gifWidth} 
                                  onChange={e => setGifWidth(Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                                />
                                <div className="flex justify-between text-[10px] uppercase font-mono text-slate-400 mt-2 font-bold px-1">
                                  <span>100</span>
                                  <span>1080px</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-fuchsia-600/70 uppercase tracking-widest">FPS Pulse</label>
                                <span className="px-2 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-800 dark:text-fuchsia-300 text-xs font-mono rounded-md font-bold">
                                  {gifFps} Hz
                                </span>
                              </div>
                              <div className="relative pt-2">
                                <input 
                                  type="range" 
                                  min="1" max="30" step="1"
                                  value={gifFps} 
                                  onChange={e => setGifFps(Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                                />
                                <div className="flex justify-between text-[10px] uppercase font-mono text-slate-400 mt-2 font-bold px-1">
                                  <span>1</span>
                                  <span>30</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                               <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-fuchsia-600/70 uppercase tracking-widest">Color Depth Array</label>
                                <span className="px-2 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-800 dark:text-fuchsia-300 text-xs font-mono rounded-md font-bold">
                                  {gifColors} Colors
                                </span>
                              </div>
                              <div className="relative pt-2">
                                <input 
                                  type="range" 
                                  min="2" max="256" step="2"
                                  value={gifColors} 
                                  onChange={e => setGifColors(Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                                />
                                <div className="flex justify-between text-[10px] uppercase font-mono text-slate-400 mt-2 font-bold px-1">
                                  <span>2</span>
                                  <span>MAX(256)</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-fuchsia-600/70 uppercase tracking-widest">Dither Matrix</label>
                              </div>
                              <div className="relative">
                                <select 
                                  value={gifDither} 
                                  onChange={e => setGifDither(e.target.value as any)}
                                  className="w-full appearance-none bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-fuchsia-800/60 text-slate-800 dark:text-fuchsia-50 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-fuchsia-500/50 outline-none transition-all cursor-pointer shadow-sm hover:border-fuchsia-400"
                                >
                                  <option value="sierra2_4a">Sierra 2-4A (HQ)</option>
                                  <option value="bayer">Bayer Matrix (Retro)</option>
                                  <option value="none">Zero Dither (Banding)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-fuchsia-600">▼</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {format === 'image' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-emerald-600/70 uppercase tracking-widest">Compression Layer</label>
                              </div>
                              <div className="relative">
                                <select 
                                  value={imageQuality} 
                                  onChange={e => setImageQuality(e.target.value as any)}
                                  className="w-full appearance-none bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-emerald-800/60 text-slate-800 dark:text-emerald-50 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all cursor-pointer shadow-sm hover:border-emerald-400"
                                >
                                  <option value="original">{t.iQualOriginal}</option>
                                  <option value="high">{t.iQualHigh}</option>
                                  <option value="medium">{t.iQualMed}</option>
                                  <option value="low">{t.iQualLow}</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-emerald-600">▼</div>
                              </div>
                            </div>
                            <div className={imageQuality === 'original' ? 'opacity-40 pointer-events-none transition-opacity' : 'transition-opacity'}>
                              <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-slate-500 dark:text-emerald-600/70 uppercase tracking-widest">Rescale Vector</label>
                                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-mono rounded-md font-bold">
                                  {imageWidth === 0 ? "SOURCE" : `${imageWidth}px`}
                                </span>
                              </div>
                              <div className="relative pt-2">
                                <input 
                                  type="range" 
                                  min="0" max="1920" step="120"
                                  value={imageWidth} 
                                  onChange={e => setImageWidth(Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-[10px] uppercase font-mono text-slate-400 mt-2 font-bold px-1">
                                  <span>0</span>
                                  <span>1920px</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <div className="relative w-full group">
                   <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-[1.5rem] blur-xl opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                   <button
                    onClick={handleDownload}
                    disabled={loading || !url}
                    className="w-full relative overflow-hidden bg-slate-900 border border-slate-800 dark:bg-[#070b14] dark:border-white/10 text-white font-black uppercase tracking-[0.2em] py-6 px-10 rounded-[1.5rem] shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] group/btn"
                   >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.1] mix-blend-overlay pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover/btn:translate-x-[150%] transition-transform duration-[1.5s] ease-in-out" />
                    <div className="flex justify-center items-center gap-4 relative z-10 w-full">
                      {loading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-200">{t.btnLoading}</span>
                        </>
                      ) : success ? (
                        <>
                          <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                             <Check className="w-5 h-5" />
                          </div>
                          <span className="text-emerald-400">{t.btnSuccess}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-6 h-6 text-cyan-400 group-hover/btn:animate-pulse" />
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">{t.btnExtract}</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* SECONDARY SIDE PANEL (Right Side on Desktop) */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Notice Card */}
                <div className="bg-gradient-to-b from-slate-200 to-slate-100 dark:from-white/10 dark:to-transparent rounded-[2rem] p-[1px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-fuchsia-500/30 transition-colors duration-700" />
                  <div className="bg-white/80 dark:bg-[#070b14]/90 backdrop-blur-2xl rounded-[1.8rem] p-8 h-full relative z-10 shadow-inner">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-2.5 bg-rose-100 dark:bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                         <ShieldAlert className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">{t.noticeTitle}</h3>
                    </div>
                    <p className="text-sm font-mono text-slate-600 dark:text-slate-400/80 leading-relaxed mb-8">
                      {t.noticeText}
                    </p>
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="w-full py-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-slate-700 dark:text-rose-400 border border-slate-200 dark:border-rose-500/20 font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-sm hover:shadow-md"
                    >
                      {t.btnConfig}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveIgSession}
        initialSessionId={igSessionId}
        lang={lang}
        dict={dict}
      />
    </div>
  );
}
