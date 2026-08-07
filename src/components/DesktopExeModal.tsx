import React, { useState } from 'react';
import {
  X,
  Download,
  HardDrive,
  Laptop,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Archive,
  Database,
  FileSpreadsheet,
  Save,
  RefreshCw,
  Cpu,
  Monitor
} from 'lucide-react';
import { CustomerRecord, VendorRecord, SalesRecord } from '../types';

interface DesktopExeModalProps {
  records: CustomerRecord[];
  vendors: VendorRecord[];
  sales: SalesRecord[];
  onClose: () => void;
  onResetData: () => void;
}

export const DesktopExeModal: React.FC<DesktopExeModalProps> = ({
  records,
  vendors,
  sales,
  onClose,
  onResetData,
}) => {
  const [copied, setCopied] = useState(false);

  const totalBytes = new Blob([
    JSON.stringify(records),
    JSON.stringify(vendors),
    JSON.stringify(sales)
  ]).size;

  const totalKB = (totalBytes / 1024).toFixed(2);

  // Backup all data into 1 JSON file
  const exportFullLocalBackup = () => {
    const fullData = {
      app: 'mobinexcorpadmin Desktop',
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      data: {
        customerRecords: records,
        vendorRecords: vendors,
        salesRecords: sales,
      }
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `mobinexcorpadmin_Full_Offline_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buildCommands = `npm run build
npm run dist`;

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(buildCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded border border-slate-300 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded flex items-center justify-center font-bold text-xs text-white">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tight text-white flex items-center gap-2">
                Desktop EXE Package & Offline Local Storage
              </h3>
              <p className="text-[10px] text-slate-400">
                Data is saved 100% locally on your computer storage with full Windows (.EXE) support.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Status Box 1: Local Data Storage Indicator */}
          <div className="bg-emerald-50 border border-emerald-300 rounded p-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <HardDrive className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span>ALL DATA SAVED LOCALLY</span>
                  <span className="bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                    OFFLINE DIRECTORY
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Your device records, supplier vendor lists, and sales transactions are stored directly on your computer's local disk storage (<code className="bg-emerald-100 text-emerald-900 px-1 py-0.2 rounded font-mono text-[10px]">localStorage / IndexedDB</code>). No cloud servers required.
                </p>
                <div className="flex items-center gap-4 mt-2 font-mono text-[11px] text-slate-700">
                  <div>
                    STORAGE USED: <strong className="text-emerald-800 font-bold">{totalKB} KB</strong>
                  </div>
                  <div>
                    ENTRIES SAVED: <strong className="text-slate-900 font-bold">{records.length + vendors.length + sales.length}</strong>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={exportFullLocalBackup}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs shrink-0 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>BACKUP ALL (.JSON)</span>
            </button>
          </div>

          {/* Status Box 2: Windows (.EXE) Desktop App Package Instructions */}
          <div className="bg-slate-50 border border-slate-300 rounded p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase">
                  Standalone Windows (.EXE) Desktop App
                </h4>
              </div>
              <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                ELECTRON BUILD READY
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              The project includes an Electron configuration (<code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-[10px]">electron.js</code>) and <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-[10px]">electron-builder</code> for compiling into a native Windows executable (<strong className="text-slate-900">.EXE</strong>).
            </p>

            <div className="bg-[#1a1c1e] text-slate-200 p-3 rounded font-mono text-[11px] space-y-1.5 border border-black relative">
              <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-700">
                <span className="flex items-center gap-1"><Terminal className="w-3 h-3 text-emerald-400" /> WINDOWS EXE COMPILATION COMMANDS</span>
                <button
                  onClick={handleCopyCommands}
                  className="text-blue-400 hover:text-white transition-colors"
                >
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
              </div>
              <p className="text-emerald-400"># 1. Build web application bundle</p>
              <p className="text-white">npm run build</p>
              <p className="text-emerald-400"># 2. Package standalone Windows .exe installer</p>
              <p className="text-white">npm run dist</p>
            </div>

            <div className="text-[11px] text-slate-500 bg-blue-50 border border-blue-200 p-2.5 rounded flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Executables are compiled into the <strong className="text-slate-800 font-mono">release/</strong> directory as <strong className="text-slate-800 font-mono">MobinexCorpAdmin-1.0.0-portable.exe</strong> and <strong className="text-slate-800 font-mono">MobinexCorpAdmin-Setup-1.0.0.exe</strong>.
              </span>
            </div>
          </div>

          {/* Status Box 3: Automated Application Updater (.BAT / NPM UPDATE) */}
          <div className="bg-amber-50 border border-amber-300 rounded p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-slate-900 text-xs uppercase">
                  Automated Desktop EXE Updater
                </h4>
              </div>
              <span className="bg-amber-200 text-amber-900 border border-amber-400 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                ONE-CLICK UPDATE
              </span>
            </div>

            <p className="text-[11px] text-slate-700">
              Whenever changes or updates are made to your app, run the automated updater tool (<code className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-mono text-[10px]">update.bat</code> or <code className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-mono text-[10px]">npm run update</code>). It automatically recompiles the web bundle and builds a fresh <strong className="text-slate-900">.EXE</strong> while preserving 100% of your local saved data!
            </p>

            <div className="bg-[#1a1c1e] text-slate-200 p-3 rounded font-mono text-[11px] space-y-1.5 border border-black">
              <div className="text-amber-400 text-[10px] pb-1 border-b border-slate-700 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-amber-400" /> AUTOMATED UPDATE COMMANDS
              </div>
              <p className="text-amber-300"># Option 1: Double click "update.bat" in the project folder</p>
              <p className="text-white">update.bat</p>
              <p className="text-amber-300 mt-1"># Option 2: Run via Node command line</p>
              <p className="text-white">npm run update</p>
            </div>
          </div>

          {/* Local Maintenance Actions */}
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs">
            <button
              onClick={onResetData}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-bold transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> RESET TO INITIAL DEMO LEDGER
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded shadow-xs"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
