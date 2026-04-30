import { X, ExternalLink, HelpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  igSessionId: string;
  onSaveSession: (sessionId: string) => void;
}

export default function SettingsModal({ isOpen, onClose, igSessionId, onSaveSession }: SettingsModalProps) {
  const [localSessionId, setLocalSessionId] = useState(igSessionId);

  // Sync prop to local state when modal opens
  useEffect(() => {
    setLocalSessionId(igSessionId);
  }, [igSessionId, isOpen]);

  const handleSave = () => {
    onSaveSession(localSessionId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Settings</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div>
            <h4 className="font-medium text-gray-900 mb-1 flex items-center gap-2">
              Instagram Authentication
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Instagram often blocks downloads without logging in. To bypass this safely, provide your "sessionid" cookie.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram 'sessionid' Cookie
            </label>
            <input 
              type="text" 
              value={localSessionId}
              onChange={(e) => setLocalSessionId(e.target.value)}
              placeholder="e.g. 123456789%3Aabcdef..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-mono"
            />
            
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-2">
              <p className="font-semibold flex items-center gap-1">
                <HelpCircle className="w-4 h-4" /> How to find your sessionid:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Log in to Instagram on your web browser.</li>
                <li>Right-click and select <span className="font-mono bg-blue-100 px-1 rounded">Inspect Element</span>.</li>
                <li>Go to the <span className="font-mono bg-blue-100 px-1 rounded">Application</span> (or Storage) tab.</li>
                <li>Expand <span className="font-mono bg-blue-100 px-1 rounded">Cookies</span> &gt; <span className="font-mono bg-blue-100 px-1 rounded">https://www.instagram.com</span></li>
                <li>Find the row named <span className="font-mono bg-blue-100 px-1 rounded">sessionid</span> and copy its Value.</li>
              </ol>
              <p className="text-blue-600 mt-2 font-medium">Your sessionid is stored securely in your browser and never saved on our servers.</p>
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
