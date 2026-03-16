'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Send, Bot, User, Loader2, BookOpen, Sparkles, Code2, Brain,
  Rocket, Settings, Menu, X, GraduationCap, Trophy, Star,
  Target, Zap, Lock, CheckCircle2, Flame, Crown, Medal,
  Award, Heart, MessageCircle, ChevronRight, Play
} from 'lucide-react'

const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

// System prompt for the AI trainer
const SYSTEM_PROMPT = `Você é um treinador de Inteligência Artificial especializado em ensinar pessoas completamente leigas. Seu objetivo é guiar o usuário do zero absoluto até conseguir criar um agente de IA funcional.

## Suas diretrizes:

### 1. Perfil do aluno:
- Não tem conhecimento técnico prévio
- Pode ter dificuldade com termos em inglês
- Precisa de explicações simples, com analogias do dia a dia
- Aprende melhor com exemplos práticos

### 2. Como responder:
- Use linguagem acessível, evite jargões técnicos
- Sempre que introduzir um conceito novo, explique com uma analogia
- Ofereça exercícios práticos ("Que tal testar agora?")
- Sugira próximos passos baseado no que o usuário já sabe
- Seja paciente e encorajador

### 3. Estrutura de ensino sugerida:
- Módulos 1-2: Conceitos básicos de IAs conversacionais e prompts
- Módulos 3-4: Técnicas avançadas de prompt e APIs
- Módulos 5-6: Criação de agentes sem código e introdução à programação
- Módulo 7: Projeto final - construir um agente de IA completo

### 4. Base de conhecimento:
Você tem acesso a um treinamento completo de 7 módulos que cobre:
- Módulo 1: Primeiros passos com IA (criar contas, interfaces, primeiras conversas)
- Módulo 2: Prompt Engineering Básico (fórmula do prompt, zero-shot, few-shot, personas)
- Módulo 3: Prompt Engineering Avançado (Chain of Thought, Tree of Thoughts, metaprompts)
- Módulo 4: Serviços de IA e APIs (tokens, provedores, API Keys, playgrounds)
- Módulo 5: No Code - Criando Agentes sem Programar (GPTs, Gems, Zapier, Make)
- Módulo 6: Low Code - Introdução à Programação para IA (Python, variáveis, loops, funções)
- Módulo 7: Projeto Final - Construindo um Agente de IA Completo

### 5. Tom e personalidade:
- Amigável e prestativo
- Encorajador e paciente
- Didático mas não condescendente
- Use emojis com moderação para tornar as respostas mais amigáveis

Sempre termine suas respostas perguntando se o usuário quer saber mais sobre algum tema específico ou se quer avançar para o próximo módulo.`;

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UserProgress {
  xp: number;
  level: number;
  totalMessages: number;
  completedModules: number[];
  unlockedBadges: string[];
  lastVisit: number;
  streak: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: any;
  condition: (progress: UserProgress) => boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Constants
const LEVELS = [
  { name: 'Iniciante', minXP: 0, icon: Star },
  { name: 'Aprendiz', minXP: 100, icon: BookOpen },
  { name: 'Explorador', minXP: 300, icon: Target },
  { name: 'Criador', minXP: 600, icon: Rocket },
  { name: 'Mestre', minXP: 1000, icon: Crown },
];

const MODULES = [
  { id: 1, title: 'Primeiros Passos com IA', description: 'Criar contas, interfaces, primeiras conversas', color: 'from-blue-500 to-cyan-400', icon: BookOpen },
  { id: 2, title: 'Prompt Engineering Básico', description: 'Fórmula do prompt, zero-shot, few-shot', color: 'from-green-500 to-emerald-400', icon: Sparkles },
  { id: 3, title: 'Prompt Engineering Avançado', description: 'Chain of Thought, Tree of Thoughts', color: 'from-purple-500 to-violet-400', icon: Brain },
  { id: 4, title: 'Serviços de IA e APIs', description: 'Tokens, provedores, API Keys', color: 'from-orange-500 to-amber-400', icon: Settings },
  { id: 5, title: 'No Code - Agentes', description: 'GPTs, Gems, Zapier, Make', color: 'from-pink-500 to-rose-400', icon: Rocket },
  { id: 6, title: 'Low Code - Programação', description: 'Python, variáveis, loops, funções', color: 'from-teal-500 to-cyan-400', icon: Code2 },
  { id: 7, title: 'Projeto Final', description: 'Construir um agente de IA completo', color: 'from-yellow-500 to-amber-400', icon: Trophy },
];

const QUICK_QUESTIONS = [
  "Não sei nada de IA, por onde começo?",
  "O que é um prompt?",
  "Como criar um GPT?",
  "Quero criar um agente de IA!",
];

const BADGES: Badge[] = [
  { id: 'first_question', name: 'Primeira Pergunta', description: 'Fez sua primeira pergunta', icon: MessageCircle, condition: p => p.totalMessages >= 1, rarity: 'common' },
  { id: 'curious', name: 'Curioso', description: 'Fez 5 perguntas', icon: Zap, condition: p => p.totalMessages >= 5, rarity: 'common' },
  { id: 'explorer', name: 'Explorador', description: 'Completou Módulo 1', icon: Target, condition: p => p.completedModules.includes(1), rarity: 'rare' },
  { id: 'prompt_master', name: 'Prompt Master', description: 'Aprendeu sobre prompts', icon: Sparkles, condition: p => p.completedModules.includes(2), rarity: 'rare' },
  { id: 'creator', name: 'Criador', description: 'Começou projeto final', icon: Rocket, condition: p => p.completedModules.includes(7), rarity: 'epic' },
  { id: 'dedicated', name: 'Dedicado', description: 'Enviou 20 mensagens', icon: Flame, condition: p => p.totalMessages >= 20, rarity: 'epic' },
  { id: 'graduated', name: 'Graduado', description: 'Completou todos os módulos', icon: GraduationCap, condition: p => p.completedModules.length >= 7, rarity: 'legendary' },
];

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-amber-600',
};

const XP_PER_MESSAGE = 15;

// Local Storage helpers
const STORAGE_KEY = 'treinamento_ia_progress';
const MESSAGES_KEY = 'treinamento_ia_messages';

const defaultProgress: UserProgress = {
  xp: 0,
  level: 0,
  totalMessages: 0,
  completedModules: [],
  unlockedBadges: [],
  lastVisit: Date.now(),
  streak: 0,
};

function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return defaultProgress;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

function saveProgress(progress: UserProgress) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function loadMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(MESSAGES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

// Confetti Component
function Confetti({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'][i % 5],
            left: `${Math.random() * 100}%`,
            top: '-20px',
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ 
            y: window.innerHeight + 100, 
            opacity: [1, 1, 0],
            rotate: Math.random() * 360 
          }}
          transition={{ 
            duration: 2 + Math.random() * 2, 
            delay: Math.random() * 0.5,
            ease: 'easeIn' 
          }}
        />
      ))}
    </div>
  );
}

// Welcome Modal Component
function WelcomeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="mx-auto mb-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </motion.div>
          <DialogTitle className="text-2xl text-center font-bold">
            🎓 Bem-vindo ao Treinamento IA!
          </DialogTitle>
          <DialogDescription className="text-center text-slate-300 mt-2">
            Sua jornada do zero ao criador de agentes de IA começa agora!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {MODULES.slice(0, 4).map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center`}>
                  <mod.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-slate-300">{mod.title}</span>
              </motion.div>
            ))}
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-yellow-200">Ganhe XP, suba de nível e desbloqueie conquistas!</span>
          </div>
        </div>
        
        <Button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/30"
        >
          <Play className="w-5 h-5 mr-2" />
          Começar Minha Jornada
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// Badge Unlock Modal
function BadgeUnlockModal({ badge, isOpen, onClose }: { badge: Badge | null; isOpen: boolean; onClose: () => void }) {
  if (!badge) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="mx-auto"
        >
          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${RARITY_COLORS[badge.rarity]} flex items-center justify-center shadow-lg`}>
            <badge.icon className="w-12 h-12 text-white" />
          </div>
        </motion.div>
        <h2 className="text-xl font-bold mt-4">🏆 Conquista Desbloqueada!</h2>
        <p className="text-lg font-semibold text-emerald-400 mt-2">{badge.name}</p>
        <p className="text-sm text-slate-400 mt-1">{badge.description}</p>
        <Button onClick={onClose} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
          Continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved data on mount
  useEffect(() => {
    const savedProgress = loadProgress();
    const savedMessages = loadMessages();
    
    setProgress(savedProgress);
    setMessages(savedMessages);
    
    // Check if first visit
    if (savedProgress.totalMessages === 0) {
      setShowWelcome(true);
    }
    
    // Update streak
    const lastVisit = new Date(savedProgress.lastVisit);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      setProgress(prev => {
        const newProgress = { ...prev, streak: prev.streak + 1, lastVisit: Date.now() };
        saveProgress(newProgress);
        return newProgress;
      });
    } else if (daysDiff > 1) {
      setProgress(prev => {
        const newProgress = { ...prev, streak: 1, lastVisit: Date.now() };
        saveProgress(newProgress);
        return newProgress;
      });
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check for new badges
  const checkBadges = useCallback((newProgress: UserProgress) => {
    for (const badge of BADGES) {
      if (!newProgress.unlockedBadges.includes(badge.id) && badge.condition(newProgress)) {
        return badge;
      }
    }
    return null;
  }, []);

  // Send message
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setInput('');
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      saveMessages(newMessages);
      return newMessages;
    });
    setIsLoading(true);

    // Update progress
    setProgress(prev => {
      const newXP = prev.xp + XP_PER_MESSAGE;
      const newLevel = LEVELS.findIndex((l, i) => 
        i === LEVELS.length - 1 || (newXP >= l.minXP && newXP < LEVELS[i + 1].minXP)
      );
      const newProgress = {
        ...prev,
        xp: newXP,
        level: newLevel,
        totalMessages: prev.totalMessages + 1,
      };
      
      // Check for level up
      if (newLevel > prev.level) {
        setTimeout(() => {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }, 500);
      }
      
      // Check for badge unlock
      const newBadge = checkBadges(newProgress);
      if (newBadge) {
        newProgress.unlockedBadges = [...newProgress.unlockedBadges, newBadge.id];
        setTimeout(() => {
          setUnlockedBadge(newBadge);
          setShowBadgeModal(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }, 1000);
      }
      
      saveProgress(newProgress);
      return newProgress;
    });

    try {
      // Build history
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      // Call OpenRouter API directly
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://treinamento-ia.app',
          'X-Title': 'Treinamento IA',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: text },
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        saveMessages(newMessages);
        return newMessages;
      });

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Desculpe, ocorreu um erro. Verifique sua conexão e tente novamente.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startModule = (moduleId: number) => {
    const moduleData = MODULES.find(m => m.id === moduleId);
    if (moduleData) {
      sendMessage(`Quero começar o Módulo ${moduleId}: ${moduleData.title}. Me explique o que vou aprender.`);
      setSidebarOpen(false);
    }
  };

  const currentLevel = LEVELS[progress.level];
  const nextLevel = LEVELS[progress.level + 1];
  const xpProgress = nextLevel 
    ? ((progress.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 
    : 100;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Confetti isActive={showConfetti} />
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
      <BadgeUnlockModal badge={unlockedBadge} isOpen={showBadgeModal} onClose={() => setShowBadgeModal(false)} />

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800
          flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        transition={{ type: 'spring', damping: 20 }}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Treinamento IA
                </h1>
                <p className="text-xs text-slate-500">Do Zero ao Agente</p>
              </div>
            </motion.div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="p-4 border-b border-slate-800">
          <Card className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border-violet-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Crown className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                  <span className="font-semibold">{currentLevel.name}</span>
                </div>
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Flame className="w-3 h-3 mr-1" />
                  {progress.streak} dias
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">XP</span>
                  <span className="text-emerald-400 font-medium">{progress.xp}</span>
                </div>
                <Progress value={xpProgress} className="h-2 bg-slate-700" />
                {nextLevel && (
                  <p className="text-xs text-slate-500 text-center">
                    {nextLevel.minXP - progress.xp} XP para {nextLevel.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules */}
        <ScrollArea className="flex-1 p-4">
          <p className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Módulos do Curso
          </p>
          <div className="space-y-2">
            {MODULES.map((moduleData, index) => {
              const isCompleted = progress.completedModules.includes(moduleData.id);
              const isAvailable = index === 0 || progress.completedModules.includes(MODULES[index - 1].id);
              
              return (
                <motion.button
                  key={moduleData.id}
                  onClick={() => isAvailable && startModule(moduleData.id)}
                  disabled={!isAvailable}
                  className={`w-full text-left p-3 rounded-xl transition-all group ${
                    isCompleted
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : isAvailable
                      ? 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600'
                      : 'bg-slate-900/50 border border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                  whileHover={isAvailable ? { scale: 1.02, x: 4 } : {}}
                  whileTap={isAvailable ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${moduleData.color} flex items-center justify-center shadow-lg ${
                      isCompleted ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : !isAvailable ? (
                        <Lock className="w-4 h-4 text-white/60" />
                      ) : (
                        <moduleData.icon className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5 bg-slate-800/50">
                          Módulo {moduleData.id}
                        </Badge>
                        {isCompleted && (
                          <Badge className="text-[10px] h-5 bg-emerald-500/20 text-emerald-400">
                            ✓ Completo
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{moduleData.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Badges */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Conquistas ({progress.unlockedBadges.length}/{BADGES.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {BADGES.map(badge => {
              const isUnlocked = progress.unlockedBadges.includes(badge.id);
              return (
                <TooltipProvider key={badge.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isUnlocked
                            ? `bg-gradient-to-br ${RARITY_COLORS[badge.rarity]}`
                            : 'bg-slate-800 border border-slate-700'
                        }`}
                        whileHover={{ scale: 1.1 }}
                      >
                        <badge.icon className={`w-5 h-5 ${isUnlocked ? 'text-white' : 'text-slate-600'}`} />
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-xs text-slate-400">{badge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center px-4 gap-4 bg-slate-900/50 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex-1">
            <h2 className="font-semibold flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
              >
                <Bot className="w-5 h-5 text-emerald-400" />
              </motion.div>
              Assistente de Treinamento
            </h2>
            <p className="text-xs text-slate-500">Pergunte o que quiser sobre IA</p>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30">
              <Zap className="w-3 h-3 mr-1" />
              {progress.xp} XP
            </Badge>
            <Badge className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30">
              <Medal className="w-3 h-3 mr-1" />
              Nível {progress.level + 1}
            </Badge>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20"
                >
                  <Bot className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Olá! 👋</h2>
                <p className="text-slate-400 mb-6">
                  Sou seu treinador de IA. Como posso te ajudar hoje?
                </p>
                
                {/* Quick Questions */}
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_QUESTIONS.map((question, i) => (
                    <motion.button
                      key={i}
                      onClick={() => sendMessage(question)}
                      className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 hover:border-slate-600 transition-all"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-sm'
                      : 'bg-slate-800 border border-slate-700 rounded-tl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    </motion.div>
                    <span className="text-slate-400 text-sm">Pensando...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/50 backdrop-blur">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(); }}
            className="max-w-3xl mx-auto flex gap-3"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Faça sua pergunta sobre IA..."
              disabled={isLoading}
              className="flex-1 bg-slate-800 border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 text-white placeholder:text-slate-500 h-12"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-12 px-6 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
          <p className="text-xs text-slate-600 text-center mt-2">
            Powered by Gemini via OpenRouter • Seus dados ficam salvos localmente
          </p>
        </div>
      </main>
    </div>
  );
}
