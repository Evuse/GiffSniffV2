/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { Settings, Download, Film, Image as ImageIcon, Link, Loader2, Info } from 'lucide-react';
import SettingsModal from './components/SettingsModal';

import { useState, useEffect } from 'react';
import { Settings, Download, Film, Image as ImageIcon, Link, Loader2, Info, LayoutTemplate, Palette, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp4' | 'gif' | 'image'>('mp4');
  
  // MP4 Settings
  const [mp4Quality, setMp4Quality] = useState<'original' | 'high' | 'medium' | 'low'>('original');
  const [mp4Width, setMp4Width] = useState<number>(0);
  const [mp4Fps, setMp4Fps] = useState<number>(0);

  // GIF Settings
  const [gifWidth, setGifWidth] = useState(480);
  const [gifFps, setGifFps] = useState(15);
  const [gifColors, setGifColors] = useState(256);
  const [gifDither, setGifDither] = useState<'sierra2_4a' | 'bayer' | 'none'>('sierra2_4a');

  // Image Settings
  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageQuality, setImageQuality] = useState<'original' | 'high' | 'medium' | 'low'>('original');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [igSessionId, setIgSessionId] = useState(() => localStorage.getItem('ig_sessionid') || '');

  const [extractedCache, setExtractedCache] = useState<{ url: string, videoUrl: string, title: string } | null>(null);

  const handleDownload = async () => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      let finalVideoUrl = '';
      let finalTitle = '';

      if (extractedCache && extractedCache.url === url) {
        // Use cached extraction if available for the same URL
        finalVideoUrl = extractedCache.videoUrl;
        finalTitle = extractedCache.title;
      } else {
        // Step 1: Extract Video URL
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, sessionid: igSessionId })
        });

        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error || 'Failed to extract video');

        finalVideoUrl = extractData.videoUrl;
        finalTitle = extractData.title;
        setExtractedCache({ url, videoUrl: finalVideoUrl, title: finalTitle });
      }

      // Step 2: Download or Process Video
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
        const errorData = await downloadRes.json();
        throw new Error(errorData.error || 'Failed to download media');
      }

      // Step 3: Trigger Browser Download
      const blob = await downloadRes.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      const extension = format === 'gif' ? 'gif' : format === 'image' ? 'jpg' : 'mp4';
      const filename = `${finalTitle || 'download'}.${extension}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIgSession = (value: string) => {
    setIgSessionId(value);
    localStorage.setItem('ig_sessionid', value);
  };

  const mp4NeedsProcessing = mp4Quality !== 'original' || mp4Width !== 0 || mp4Fps !== 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-purple-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-16">
      
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-200">
            <Download className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-slate-800 hidden sm:block">SocialDownloader</h1>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 rounded-full border border-slate-200 shadow-sm transition-all"
        >
          <Settings className="w-4 h-4" />
          <span>IG Login</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-4 border border-indigo-100">
              High Quality Downloader
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
              Download any video.
            </h2>
            <p className="text-slate-500 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
              Paste a Pinterest or Instagram link to get started. Grab the raw MP4 or convert directly to a highly-optimized GIF.
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-2"
        >
          <div className="p-5 sm:p-8 space-y-8 bg-white rounded-2xl border border-slate-100">
            
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-semibold text-slate-700 mb-2">Video URL</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-slate-400">
                  <Link className="h-5 w-5" />
                </div>
                <input
                  type="url"
                  id="url"
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 sm:text-base outline-none transition-all placeholder:text-slate-400"
                  placeholder="https://www.instagram.com/p/... or it.pinterest.com/pin/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Output Format</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setFormat('mp4')}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all ${
                    format === 'mp4' 
                      ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100/50' 
                      : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-3 rounded-full mb-3 ${format === 'mp4' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Film className="w-6 h-6" />
                  </div>
                  <span className={`font-semibold ${format === 'mp4' ? 'text-indigo-900' : 'text-slate-600'}`}>Video (MP4)</span>
                  {format === 'mp4' && (
                    <motion.div layoutId="format-check" className="absolute top-3 right-3 text-indigo-600">
                      <Check className="w-5 h-5" />
                    </motion.div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('gif')}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all ${
                    format === 'gif' 
                      ? 'border-purple-600 bg-purple-50 shadow-md shadow-purple-100/50' 
                      : 'border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-3 rounded-full mb-3 ${format === 'gif' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className={`font-semibold ${format === 'gif' ? 'text-purple-900' : 'text-slate-600'}`}>Animation (GIF)</span>
                  {format === 'gif' && (
                    <motion.div layoutId="format-check" className="absolute top-3 right-3 text-purple-600">
                      <Check className="w-5 h-5" />
                    </motion.div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('image')}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all ${
                    format === 'image' 
                      ? 'border-emerald-600 bg-emerald-50 shadow-md shadow-emerald-100/50' 
                      : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-3 rounded-full mb-3 ${format === 'image' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className={`font-semibold ${format === 'image' ? 'text-emerald-900' : 'text-slate-600'}`}>Image (JPG)</span>
                  {format === 'image' && (
                    <motion.div layoutId="format-check" className="absolute top-3 right-3 text-emerald-600">
                      <Check className="w-5 h-5" />
                    </motion.div>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Settings Layout */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                {format === 'mp4' ? <Zap className="w-32 h-32" /> : <Palette className="w-32 h-32" />}
              </div>
              
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                Advanced Settings
              </h3>

              <AnimatePresence mode="wait">
                {format === 'mp4' ? (
                  <motion.div
                    key="mp4-settings"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Compression Quality</label>
                      <select 
                        value={mp4Quality} 
                        onChange={(e: any) => setMp4Quality(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="original">Original (Fastest, no compression)</option>
                        <option value="high">High Quality (Light compression)</option>
                        <option value="medium">Medium Quality (Good balance)</option>
                        <option value="low">Low Quality (Smallest size)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Resolution</label>
                      <select 
                        value={mp4Width} 
                        onChange={(e) => setMp4Width(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value={0}>Original Resource Size</option>
                        <option value={1080}>1080p Width</option>
                        <option value={720}>720p Width</option>
                        <option value={480}>480p Width</option>
                        <option value={360}>360p Width</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 text-xs text-slate-500 bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                      <p>
                        {mp4Quality === 'original' && mp4Width === 0
                          ? "Video will be downloaded directly without re-encoding. This is the fastest method."
                          : "Video will be processed on the server to reduce file size. This might take roughly 10-30 seconds depending on video length."}
                      </p>
                    </div>
                  </motion.div>
                ) : format === 'image' ? (
                  <motion.div
                    key="image-settings"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Quality Level</label>
                      <select 
                        value={imageQuality} 
                        onChange={(e: any) => setImageQuality(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="original">Original</option>
                        <option value="high">High Quality</option>
                        <option value="medium">Medium Quality</option>
                        <option value="low">Low Quality</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Target Width</label>
                      <select 
                        value={imageWidth} 
                        onChange={(e) => setImageWidth(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={0}>Original</option>
                        <option value={1080}>1080px</option>
                        <option value={720}>720px</option>
                        <option value={480}>480px</option>
                      </select>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="gif-settings"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 relative z-10"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Width Slider */}
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <LayoutTemplate className="w-4 h-4 text-slate-400" /> Width
                          </label>
                          <span className="text-sm text-slate-500 font-mono bg-white px-1.5 rounded">{gifWidth}px</span>
                        </div>
                        <input 
                          type="range" 
                          min="240" max="1080" step="10"
                          value={gifWidth} 
                          onChange={(e) => setGifWidth(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">Keep under 480px for standard GIFs.</p>
                      </div>

                      {/* Framerate Slider */}
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <Film className="w-4 h-4 text-slate-400" /> Framerate
                          </label>
                          <span className="text-sm text-slate-500 font-mono bg-white px-1.5 rounded">{gifFps} <span className="text-[10px]">fps</span></span>
                        </div>
                        <input 
                          type="range" 
                          min="5" max="30" step="1"
                          value={gifFps} 
                          onChange={(e) => setGifFps(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">15-20 fps is recommended.</p>
                      </div>

                      {/* Colors Select */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Color Palette (Max Colors)</label>
                        <select 
                          value={gifColors} 
                          onChange={(e) => setGifColors(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value={256}>256 Colors (Max Quality, Large)</option>
                          <option value={128}>128 Colors (Good Quality, Medium)</option>
                          <option value={64}>64 Colors (Retro look, Small)</option>
                          <option value={32}>32 Colors (Very Small)</option>
                        </select>
                      </div>

                      {/* Dithering Select */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Dithering Method</label>
                        <select 
                          value={gifDither} 
                          onChange={(e: any) => setGifDither(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="sierra2_4a">Sierra (Smooth gradients)</option>
                          <option value="bayer">Bayer (Crosshatch pattern)</option>
                          <option value="none">None (Gradients will band, smallest file)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start text-sm border border-red-100 shadow-sm shadow-red-100/50">
                    <Info className="w-5 h-5 mr-3 flex-shrink-0 text-red-500 mt-0.5" />
                    <p className="font-medium">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Loading specific alerts */}
            <AnimatePresence>
              {loading && (format === 'gif' || mp4NeedsProcessing) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-xl flex items-start text-sm border border-blue-100 shadow-sm shadow-blue-100/50">
                    <div className="relative w-5 h-5 mr-3 flex-shrink-0 mt-0.5">
                      <div className="absolute inset-0 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="font-medium">
                      Processing file on the server. This may take a while depending on video length and size...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              onClick={handleDownload}
              disabled={loading || !url}
              className={`relative w-full overflow-hidden font-bold text-lg py-4 px-6 rounded-2xl transition-all shadow-xl flex justify-center items-center gap-3 disabled:cursor-not-allowed group ${
                format === 'mp4' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 disabled:bg-slate-300 disabled:shadow-none' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30 disabled:bg-slate-300 disabled:shadow-none'
              }`}
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 hover:bg-transparent transition-colors disabled:hidden duration-300 pointer-events-none mix-blend-overlay"></div>
              
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Working magic...
                </>
              ) : (
                <>
                  <Download className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform duration-300" />
                  Generate & Download
                </>
              )}
            </button>
            
          </div>
        </motion.div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        igSessionId={igSessionId}
        onSaveSession={handleSaveIgSession}
      />
    </div>
  );
}

