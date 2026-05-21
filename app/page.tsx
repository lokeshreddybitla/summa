'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  FileText, Image, Type, Zap, BookOpen, ChevronRight,
  Copy, Download, RotateCcw, Key, Eye, EyeOff,
  Sparkles, GraduationCap, AlignLeft, List, CreditCard,
  X, Upload, ChevronLeft, ChevronRight as ChevronRightIcon,
  Check, Loader2
} from 'lucide-react';

type Mode = 'normal' | 'exam';
type OutputFormat = 'paragraph' | 'bullets' | 'flashcards';
type InputType = 'text' | 'pdf' | 'image';

interface Flashcard {
  front: string;
  back: string;
}

interface SummaryResult {
  type: 'text' | 'bullets' | 'flashcards';
  data: string | Flashcard[];
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('normal');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('paragraph');
  const [inputType, setInputType] = useState<InputType>('text');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`File loaded: ${file.name}`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: inputType === 'pdf'
      ? { 'application/pdf': ['.pdf'] }
      : { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (fileRejections) => {
      const reason = fileRejections[0]?.errors[0]?.message || 'File rejected';
      toast.error(reason);
    },
  });

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'normal' && outputFormat === 'flashcards') {
      setOutputFormat('paragraph');
    }
    setResult(null);
  };

  const handleSummarize = async () => {
    if (!textInput.trim() && !uploadedFile) {
      toast.error('Please add some content to summarize');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setFlippedCards(new Set());
    setCurrentCard(0);

    try {
      const formData = new FormData();
      formData.append('mode', mode);
      formData.append('outputFormat', outputFormat);
      formData.append('apiKey', apiKey);

      if (uploadedFile && inputType !== 'text') {
        formData.append('file', uploadedFile);
      } else {
        formData.append('text', textInput);
      }

      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to summarize');
      }

      setResult(data);
      toast.success('Summary ready!');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    let text = '';
    if (result?.type === 'flashcards') {
      const cards = result.data as Flashcard[];
      text = cards.map((c, i) => `Card ${i + 1}\nQ: ${c.front}\nA: ${c.back}`).join('\n\n');
    } else {
      text = result?.data as string || '';
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  };

  const handleDownload = () => {
    let text = '';
    let filename = 'summary.txt';

    if (result?.type === 'flashcards') {
      const cards = result.data as Flashcard[];
      text = `FLASHCARDS\n${'='.repeat(40)}\n\n` +
        cards.map((c, i) => `Card ${i + 1}\nQuestion: ${c.front}\nAnswer: ${c.back}`).join('\n\n---\n\n');
      filename = 'flashcards.txt';
    } else {
      text = result?.data as string || '';
      filename = mode === 'exam' ? 'exam-notes.txt' : 'summary.txt';
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const handleReset = () => {
    setResult(null);
    setTextInput('');
    setUploadedFile(null);
    setFlippedCards(new Set());
    setCurrentCard(0);
  };

  const toggleCard = (index: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const modeColor = mode === 'exam' ? '#00D4AA' : '#F5C842';
  const modeGlow = mode === 'exam' ? 'rgba(0,212,170,0.2)' : 'rgba(245,200,66,0.2)';

  const renderResult = () => {
    if (!result) return null;

    if (result.type === 'flashcards') {
      const cards = result.data as Flashcard[];
      return (
        <div className="space-y-6">
          {/* Card navigation */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono" style={{ color: modeColor }}>
              {currentCard + 1} / {cards.length} cards
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentCard(Math.max(0, currentCard - 1))}
                disabled={currentCard === 0}
                className="p-2 rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentCard(Math.min(cards.length - 1, currentCard + 1))}
                disabled={currentCard === cards.length - 1}
                className="p-2 rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>

          {/* Current flashcard */}
          <div className="flashcard-scene" style={{ height: '240px' }}>
            <div
              className={`flashcard-card w-full h-full ${flippedCards.has(currentCard) ? 'flipped' : ''}`}
              onClick={() => toggleCard(currentCard)}
            >
              {/* Front */}
              <div
                className="flashcard-face"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${modeColor}30`,
                }}
              >
                <div className="text-xs font-mono mb-3 opacity-40 uppercase tracking-wider">Question</div>
                <p className="text-center text-lg font-display font-medium leading-relaxed">
                  {cards[currentCard]?.front}
                </p>
                <div className="mt-4 text-xs opacity-30">tap to reveal answer</div>
              </div>
              {/* Back */}
              <div
                className="flashcard-face flashcard-back"
                style={{
                  background: `${modeColor}10`,
                  border: `1px solid ${modeColor}40`,
                }}
              >
                <div className="text-xs font-mono mb-3 opacity-60 uppercase tracking-wider" style={{ color: modeColor }}>Answer</div>
                <p className="text-center text-base leading-relaxed">
                  {cards[currentCard]?.back}
                </p>
                <div className="mt-4 text-xs opacity-30">tap to flip back</div>
              </div>
            </div>
          </div>

          {/* All cards grid */}
          <div className="mt-8">
            <p className="text-xs font-mono opacity-40 uppercase tracking-wider mb-4">All Cards</p>
            <div className="grid gap-3">
              {cards.map((card, i) => (
                <div
                  key={i}
                  className="flashcard-scene cursor-pointer"
                  style={{ height: '120px' }}
                  onClick={() => {
                    setCurrentCard(i);
                    toggleCard(i);
                  }}
                >
                  <div className={`flashcard-card w-full h-full ${flippedCards.has(i) ? 'flipped' : ''}`}>
                    <div
                      className="flashcard-face rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid rgba(255,255,255,0.07)`,
                      }}
                    >
                      <span className="text-xs font-mono opacity-30 mb-2">Q{i + 1}</span>
                      <p className="text-center text-sm">{card.front}</p>
                    </div>
                    <div
                      className="flashcard-face flashcard-back rounded-xl"
                      style={{
                        background: `${modeColor}08`,
                        border: `1px solid ${modeColor}25`,
                      }}
                    >
                      <span className="text-xs font-mono opacity-40 mb-2" style={{ color: modeColor }}>A{i + 1}</span>
                      <p className="text-center text-sm">{card.back}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Text / bullets output
    const text = result.data as string;
    const lines = text.split('\n').filter(l => l.trim());

    return (
      <div className="output-content space-y-2">
        {lines.map((line, i) => {
          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');
          const isHeader = line.trim().startsWith('**') && line.trim().endsWith('**');
          const isSubBullet = line.trim().startsWith('-') || line.trim().startsWith('  ');

          if (isHeader) {
            const headerText = line.replace(/\*\*/g, '').trim();
            return (
              <h3 key={i} className="font-display font-semibold text-base mt-6 mb-2 first:mt-0" style={{ color: modeColor }}>
                {headerText}
              </h3>
            );
          }

          if (isBullet || isSubBullet) {
            const bulletText = line.replace(/^[•\-\*]\s*/, '').trim();
            return (
              <div key={i} className={`flex gap-3 ${isSubBullet && !isBullet ? 'ml-4' : ''}`}>
                <span className="mt-1 flex-shrink-0 text-xs" style={{ color: modeColor }}>▸</span>
                <p className="text-[15px] leading-relaxed text-white/85">{bulletText}</p>
              </div>
            );
          }

          return (
            <p key={i} className="text-[15px] leading-relaxed text-white/85">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: `radial-gradient(circle, ${modeColor}, transparent)`, transition: 'background 0.5s' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: `radial-gradient(circle, ${modeColor}, transparent)`, transition: 'background 0.5s' }}
        />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #FF4D6D, transparent)' }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full text-xs font-mono tracking-wider"
            style={{ background: `${modeColor}10`, border: `1px solid ${modeColor}30`, color: modeColor }}>
            <Sparkles size={10} />
            POWERED BY GEMINI AI
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-3">
            <span className="text-white">Sum</span>
            <span style={{ color: modeColor, textShadow: `0 0 40px ${modeGlow}`, transition: 'color 0.4s, text-shadow 0.4s' }}>ma</span>
          </h1>
          <p className="text-white/40 text-lg max-w-md mx-auto font-body">
            Summarize anything — text, PDFs, or images — in seconds with AI
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="relative flex p-1 rounded-2xl gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { id: 'normal', label: 'Normal', icon: Sparkles, desc: 'Quick summary' },
              { id: 'exam', label: 'Exam', icon: GraduationCap, desc: 'Study mode' },
            ].map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => handleModeChange(id as Mode)}
                className="relative flex items-center gap-2.5 px-6 py-3 rounded-xl transition-all duration-300 group"
                style={mode === id ? {
                  background: `${modeColor}15`,
                  boxShadow: `0 0 20px ${modeColor}20`,
                  border: `1px solid ${modeColor}40`,
                } : { border: '1px solid transparent' }}
              >
                <Icon size={15} style={{ color: mode === id ? modeColor : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }} />
                <div className="text-left">
                  <div className="text-sm font-display font-semibold" style={{ color: mode === id ? modeColor : 'rgba(255,255,255,0.7)', transition: 'color 0.3s' }}>
                    {label}
                  </div>
                  <div className="text-xs opacity-50 hidden md:block">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Input */}
          <div className="space-y-4">
            {/* Input Type Selector */}
            <div className="flex gap-2">
              {[
                { id: 'text', label: 'Text', icon: Type },
                { id: 'pdf', label: 'PDF', icon: FileText },
                { id: 'image', label: 'Image', icon: Image },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setInputType(id as InputType); setUploadedFile(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={inputType === id ? {
                    background: `${modeColor}15`,
                    border: `1px solid ${modeColor}50`,
                    color: modeColor,
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              {inputType === 'text' ? (
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your content here — an article, notes, essay, or any text you want summarized..."
                  className="w-full min-h-[280px] p-4 text-sm leading-relaxed resize-none outline-none text-white/80 placeholder-white/20 font-body"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                />
              ) : (
                <div
                  {...getRootProps()}
                  className="min-h-[280px] flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-200"
                  style={{
                    background: isDragActive ? `${modeColor}08` : 'rgba(255,255,255,0.02)',
                    border: isDragActive ? `2px dashed ${modeColor}60` : '2px dashed rgba(255,255,255,0.08)',
                  }}
                >
                  <input {...getInputProps()} />
                  {uploadedFile ? (
                    <div className="text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: `${modeColor}15` }}>
                        {inputType === 'pdf' ? <FileText size={24} style={{ color: modeColor }} /> : <Image size={24} style={{ color: modeColor }} />}
                      </div>
                      <p className="font-display font-semibold text-white/80 mb-1">{uploadedFile.name}</p>
                      <p className="text-xs text-white/30">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                        className="mt-3 text-xs text-white/30 hover:text-white/60 flex items-center gap-1 mx-auto transition-colors"
                      >
                        <X size={12} /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <Upload size={24} className="text-white/20" />
                      </div>
                      <p className="font-display font-semibold text-white/50 mb-1">
                        {isDragActive ? 'Drop it here' : `Drop your ${inputType.toUpperCase()} here`}
                      </p>
                      <p className="text-xs text-white/25">or click to browse · max 10MB</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Output Format */}
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-white/30 mb-2">Output Format</p>
              <div className="flex gap-2">
                {[
                  { id: 'paragraph', label: 'Paragraph', icon: AlignLeft },
                  { id: 'bullets', label: 'Bullets', icon: List },
                  ...(mode === 'exam' ? [{ id: 'flashcards', label: 'Flashcards', icon: CreditCard }] : []),
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setOutputFormat(id as OutputFormat)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all duration-200"
                    style={outputFormat === id ? {
                      background: `${modeColor}15`,
                      border: `1px solid ${modeColor}50`,
                      color: modeColor,
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1.5">
                <Key size={10} /> API Key (optional)
              </p>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your Gemini API key (uses default if empty)"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none text-white/70 placeholder-white/20 font-mono"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[11px] text-white/20 mt-1.5 flex items-center gap-1">
                <span>Get your key at</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                  className="underline hover:text-white/40 transition-colors" style={{ color: modeColor + '80' }}>
                  aistudio.google.com
                </a>
              </p>
            </div>

            {/* Summarize Button */}
            <button
              onClick={handleSummarize}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl font-display font-semibold text-base tracking-wide transition-all duration-300 relative overflow-hidden group"
              style={{
                background: isLoading ? 'rgba(255,255,255,0.05)' : modeColor,
                color: isLoading ? 'rgba(255,255,255,0.4)' : '#0A0A0F',
                boxShadow: isLoading ? 'none' : `0 8px 32px ${modeGlow}`,
                border: isLoading ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing content...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap size={18} />
                  Summarize Now
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>

          {/* RIGHT COLUMN: Output */}
          <div>
            <div
              className="rounded-2xl overflow-hidden h-full min-h-[520px] flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: result ? `1px solid ${modeColor}25` : '1px solid rgba(255,255,255,0.06)',
                transition: 'border-color 0.4s',
              }}
            >
              {/* Output Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: result ? modeColor : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
                  <span className="text-xs font-mono uppercase tracking-wider text-white/30">
                    {result ? (
                      result.type === 'flashcards' ? `${(result.data as Flashcard[]).length} Flashcards` :
                      result.type === 'bullets' ? 'Bullet Summary' : 'Summary'
                    ) : 'Output'}
                  </span>
                </div>
                {result && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCopy}
                      className="p-2 rounded-lg transition-all text-white/40 hover:text-white/70"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      title="Copy"
                    >
                      {copied ? <Check size={14} style={{ color: modeColor }} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 rounded-lg transition-all text-white/40 hover:text-white/70"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={handleReset}
                      className="p-2 rounded-lg transition-all text-white/40 hover:text-white/70"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      title="Reset"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Output Body */}
              <div className="flex-1 p-5 overflow-y-auto">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full" style={{ border: `2px solid ${modeColor}20` }} />
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: `2px solid ${modeColor}`,
                          borderTopColor: 'transparent',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-display font-semibold text-white/60 mb-1">Processing</p>
                      <p className="text-xs text-white/25 font-mono">
                        {outputFormat === 'flashcards' ? 'Creating flashcards...' :
                         mode === 'exam' ? 'Generating study notes...' : 'Summarizing content...'}
                      </p>
                    </div>
                    <div className="w-48 space-y-2">
                      {[1, 0.7, 0.5].map((opacity, i) => (
                        <div key={i} className="h-2 rounded-full shimmer" style={{ opacity, background: 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                  </div>
                ) : result ? (
                  <div className="animate-fade-in">
                    {/* Mode badge */}
                    <div className="flex items-center gap-2 mb-5">
                      <span className="text-xs px-2.5 py-1 rounded-full font-mono tracking-wider"
                        style={{ background: `${modeColor}15`, color: modeColor, border: `1px solid ${modeColor}30` }}>
                        {mode === 'exam' ? '📚 Exam Mode' : '⚡ Normal Mode'}
                      </span>
                      {outputFormat !== 'paragraph' && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-mono tracking-wider"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {outputFormat === 'flashcards' ? '🃏 Flashcards' : '• Bullets'}
                        </span>
                      )}
                    </div>
                    {renderResult()}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {mode === 'exam' ? (
                        <BookOpen size={28} className="text-white/15" />
                      ) : (
                        <AlignLeft size={28} className="text-white/15" />
                      )}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-white/25 mb-1.5">Your summary appears here</p>
                      <p className="text-xs text-white/15 max-w-[200px]">
                        {mode === 'exam'
                          ? 'Exam-ready notes, bullets, and flashcards'
                          : 'Clear, concise paragraph or bullet summaries'}
                      </p>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[modeColor + '40', modeColor + '25', modeColor + '15'].map((color, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: color, animationDelay: `${i * 0.3}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-white/15 font-mono">
            Built with Next.js · Powered by Google Gemini · No data stored
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
