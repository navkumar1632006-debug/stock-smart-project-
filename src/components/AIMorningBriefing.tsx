import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Square, Volume2, Globe, TrendingUp, AlertTriangle, HelpCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface AIMorningBriefingProps {
  onRefreshTrigger?: () => void;
}

export const AIMorningBriefing: React.FC<AIMorningBriefingProps> = ({ onRefreshTrigger }) => {
  const [briefText, setBriefText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<string>('en-IN');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBriefing = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai-briefing');
      if (!res.ok) throw new Error("Could not construct daily operational briefing.");
      const data = await res.json();
      setBriefText(data.text || '');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Briefing failed to build.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  // Browser Text-To-Speech Playback
  const handleToggleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!briefText) return;

    // Remove markdown symbols for cleaner TTS
    const cleanText = briefText
      .replace(/\*\*/g, '')
      .replace(/#/g, '')
      .replace(/-/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedLang;
    utterance.rate = 0.95; // Friendly pace

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Multi-Language presets
  const languages = [
    { code: 'en-IN', name: 'English (India)' },
    { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)' }
  ];

  return (
    <Card className="bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-slate-950 border-indigo-200 shadow-2xl relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-indigo-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-200">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">AI Daily Morning Briefing</h3>
              <Badge variant="default" className="bg-indigo-500/20 border-indigo-200">
                Copilot Mode
              </Badge>
            </div>
            <p className="text-xs text-slate-500/90 font-mono">Generative store operations intelligence and predictive actions</p>
          </div>
        </div>

        {/* TTS and Lang Selector */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          {/* Language Selector */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/30 px-2.5 py-1.5 rounded-2xl text-slate-500/90">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <select
              aria-label="Select language"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-mono font-medium cursor-pointer text-slate-700"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-50 text-slate-700 text-xs">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleToggleSpeak}
            disabled={isLoading || !!errorMsg}
            variant={isSpeaking ? "destructive" : "primary"}
            size="sm"
            className="uppercase tracking-wider flex items-center space-x-1.5"
          >
            {isSpeaking ? (
              <>
                <Square className="w-3.5 h-3.5 text-white" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-white" />
                <span>Listen Briefing</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Content box */}
      <div className="mt-4">
        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-6 animate-fade-in">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-200 flex items-center justify-center animate-pulse relative z-10">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl animate-ping opacity-75"></div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-800">Synthesizing AI Intelligence</p>
              <p className="text-xs font-mono text-slate-500/90">Analyzing inventory metrics, forecasting demands, and generating your morning brief...</p>
            </div>
            <div className="w-64 h-1.5 bg-white rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full w-full origin-left animate-pulse scale-x-50"></div>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center space-x-2 text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <CardContent className="bg-white shadow-sm border border-slate-200/30 rounded-2xl p-6 md:p-6 text-slate-800">
            {/* Format paragraphs elegantly */}
            {briefText.split('\n').map((line, idx) => {
              const cleaned = line.trim();
              if (!cleaned) return <div key={idx} className="h-2" />;

              // Highlight critical parts
              let renderedLine: React.ReactNode = line;
              if (cleaned.startsWith('-') || cleaned.startsWith('*')) {
                const bulletContent = cleaned.substring(1).trim();
                return (
                  <div key={idx} className="flex items-start space-x-2 my-2 text-sm text-slate-700">
                    <span className="text-indigo-600 font-extrabold mt-0.5">•</span>
                    <p className="leading-relaxed font-sans">{bulletContent}</p>
                  </div>
                );
              }

              // Heading formatting
              if (cleaned.startsWith('###')) {
                return (
                  <h4 key={idx} className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mt-4 mb-1 border-l-2 border-indigo-500 pl-2">
                    {cleaned.replace('###', '').trim()}
                  </h4>
                );
              }

              return (
                <p key={idx} className="text-sm leading-relaxed font-sans text-slate-700 my-1.5">
                  {renderedLine}
                </p>
              );
            })}
          </CardContent>
        )}
      </div>

      {/* Advice ribbon */}
      <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-50/20 px-3.5 py-2.5 rounded-2xl border border-slate-200/30">
        <span className="flex items-center">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
          Projections updated daily based on historic sales run-rates.
        </span>
        <Button
          onClick={fetchBriefing}
          variant="ghost"
          size="sm"
          className="text-indigo-600 hover:text-indigo-700 font-medium uppercase hover:bg-transparent"
        >
          Re-Synthesize
        </Button>
      </div>
    </Card>
  );
};
