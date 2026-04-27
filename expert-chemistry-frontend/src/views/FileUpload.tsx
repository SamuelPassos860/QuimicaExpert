import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  FileJson,
  FileCode
} from 'lucide-react';

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  progress: number;
}

export default function FileUpload() {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    addFiles(droppedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const filesToUpload = newFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0
    }));
    setFiles(prev => [...prev, ...filesToUpload]);
    
    // Simulate upload for each file
    filesToUpload.forEach(f => simulateUpload(f.file.name));
  };

  const simulateUpload = (fileName: string) => {
    setFiles(prev => prev.map(f => 
      f.file.name === fileName ? { ...f, status: 'uploading' } : f
    ));

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f => 
          f.file.name === fileName ? { ...f, status: 'complete', progress: 100 } : f
        ));
      } else {
        setFiles(prev => prev.map(f => 
          f.file.name === fileName ? { ...f, progress } : f
        ));
      }
    }, 500);
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.file.name !== name));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx') return <FileSpreadsheet className="text-green-400" />;
    if (ext === 'json') return <FileJson className="text-yellow-400" />;
    if (ext === 'pdf') return <FileCode className="text-red-400" />;
    return <File className="text-blue-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">Spectral Input</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-white tracking-tight">Data Acquisition</h1>
        <p className="text-white/40 mt-1 max-w-2xl text-sm leading-relaxed">Securely ingest experimental results, spectral signatures or inventory logs for automated high-performance analysis.</p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative glass-panel p-16 border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-6 text-center group rounded-[2rem] overflow-hidden
          ${isDragging ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_50px_rgba(167,200,255,0.1)]' : 'border-white/[0.05] hover:border-white/20 hover:bg-white/[0.02]'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className={`p-6 rounded-2xl bg-white/[0.03] border border-white/10 transition-all duration-500 relative z-10 ${isDragging ? 'scale-110 shadow-[0_0_30px_rgba(167,200,255,0.2)] border-primary/30' : 'group-hover:scale-105 group-hover:border-white/20'}`}>
          <Upload size={48} className={`transition-colors duration-500 ${isDragging ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`} />
        </div>
        <div className="space-y-2 relative z-10">
          <p className="text-xl font-display font-bold text-white">Stream raw data into core</p>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Supported: .CSV, .XLSX, .JSON, .SPECTRA (Max 256MB)</p>
        </div>
        <input 
          type="file" 
          multiple 
          onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
          className="absolute inset-0 opacity-0 cursor-pointer z-20" 
        />
        <button className="mt-4 px-8 py-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.08] transition-all text-[10px] font-mono text-white uppercase tracking-[0.3em] pointer-events-none relative z-10 font-bold group-hover:border-white/30">
          Mount Local Drive
        </button>
      </div>

      {files.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Active Buffer</h2>
            <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">{files.length} NODES_PENDING</span>
          </div>
          
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {files.map((f) => (
                <motion.div
                  key={f.file.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="glass-panel p-5 flex items-center gap-6 group border-white/[0.03] rounded-2xl relative overflow-hidden"
                >
                  {f.status === 'complete' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 shadow-[2px_0_10px_rgba(34,197,94,0.3)]" />
                  )}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-primary group-hover:scale-110 transition-transform">
                    {getFileIcon(f.file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm text-white/90 font-bold truncate group-hover:text-white transition-colors">{f.file.name}</span>
                      <span className="text-[10px] font-mono text-white/20 font-bold uppercase tracking-widest italic">{(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="relative">
                      {f.status === 'uploading' && (
                        <div className="h-1.5 w-full bg-white/[0.02] border border-white/5 rounded-full overflow-hidden p-0.5 shadow-inner">
                          <motion.div 
                            className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(167,200,255,0.4)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${f.progress}%` }}
                          />
                        </div>
                      )}
                      {f.status === 'complete' && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-green-500/10 border border-green-500/20 rounded-full overflow-hidden p-0.5">
                            <div className="h-full w-full bg-green-500 rounded-full" />
                          </div>
                          <span className="text-[8px] font-mono text-green-400 uppercase tracking-[0.2em] font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} /> IO_READY
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {f.status === 'uploading' ? (
                      <Loader2 size={20} className="text-primary animate-spin" />
                    ) : f.status === 'complete' ? (
                      <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                        <CheckCircle2 size={20} />
                      </div>
                    ) : null}
                    <button 
                      onClick={() => removeFile(f.file.name)}
                      className="p-2.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all text-white/20 hover:text-red-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="pt-6 flex justify-end">
            <button className="group px-10 py-5 bg-primary text-on-primary text-xs font-bold uppercase tracking-[0.4em] transition-all transform hover:scale-[1.02] active:scale-[0.98] rounded-2xl shadow-xl hover:shadow-primary/30 relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-3">
                Process Batch Pipeline <Upload size={18} />
              </span>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
