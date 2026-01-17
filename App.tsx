
import React, { useState, useEffect, useRef } from 'react';
import { Ghost, GameStatus, GameState, LevelData, JournalEntry } from './types';
import { LEVELS, MAX_LIVES } from './constants';
import { getSpectralEncounter, generateRoomImage, generateSpeech, generateJournalEntry } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('ace_ghostly_state');
    const today = new Date().toDateString();
    
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lastDailyReset !== today) {
        return { ...parsed, lives: MAX_LIVES, lastDailyReset: today, status: 'MENU', inventory: [], journal: [] };
      }
      return { ...parsed, status: 'MENU' };
    }
    
    return {
      level: 1,
      lives: MAX_LIVES,
      status: 'MENU',
      lastDailyReset: today,
      inventory: [],
      journal: []
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [consequence, setConsequence] = useState<string | null>(null);
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [introStep, setIntroStep] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientNodeRef = useRef<{ drone: AudioBufferSourceNode | OscillatorNode, wind: AudioBufferSourceNode } | null>(null);
  const dialogueSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const introStory = [
    { text: "Ace's bicycle chain snapped just as the sun dipped behind the jagged peaks of the Forbidden Hill.", sound: 'RAIN' },
    { text: "A 'Phantom Storm' rolled in—clouds like bruised fists, smelling of old iron and wet earth.", sound: 'THUNDER' },
    { text: "The gates of the Manor groaned open, inviting him into a silence that felt heavier than the rain.", sound: 'DOOR' },
    { text: "He stepped inside. The lock clicked. The shadows detached themselves from the floor. Ace was the manor's guest now.", sound: 'GHOST' }
  ];

  useEffect(() => {
    localStorage.setItem('ace_ghostly_state', JSON.stringify(state));
  }, [state]);

  const resumeAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 0.25;
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const stopDialogue = () => {
    if (dialogueSourceRef.current) {
      try {
        dialogueSourceRef.current.stop();
      } catch (e) {}
      dialogueSourceRef.current = null;
      setIsSpeaking(false);
    }
  };

  const playSFX = (type: string) => {
    resumeAudio();
    const ctx = audioContextRef.current!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
      case 'PAGE_TURN':
        osc.frequency.setValueAtTime(400, now);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
        break;
      case 'HAUNTED_START':
        const osc3 = ctx.createOscillator();
        const g3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(60, now);
        g3.gain.setValueAtTime(0, now);
        g3.gain.linearRampToValueAtTime(0.4, now + 0.5);
        g3.gain.exponentialRampToValueAtTime(0.0001, now + 4);
        osc3.connect(g3); g3.connect(ctx.destination);
        osc3.start(); osc3.stop(now + 4);
        break;
      case 'THUNDER':
        playSFX('HAUNTED_START');
        break;
      case 'RAIN':
        osc.frequency.setValueAtTime(50, now);
        g.gain.setValueAtTime(0.1, now);
        g.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(); osc.stop(now + 1);
        break;
      case 'DOOR':
        osc.frequency.setValueAtTime(100, now);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        osc.start(); osc.stop(now + 1.5);
        break;
      case 'CLICK':
        osc.frequency.setValueAtTime(400, now);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
        break;
      case 'GHOST':
        osc.frequency.setValueAtTime(220, now);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.1, now + 1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3);
        osc.start(); osc.stop(now + 3);
        break;
      case 'ITEM':
        osc.frequency.setValueAtTime(880, now);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        osc.start(); osc.stop(now + 0.2);
        break;
      case 'SUCCESS':
        osc.frequency.setValueAtTime(659, now);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc.start(); osc.stop(now + 0.6);
        break;
      case 'FAILURE':
        osc.type = 'square';
        osc.frequency.setValueAtTime(50, now);
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        osc.start(); osc.stop(now + 0.8);
        break;
    }
  };

  const startAmbient = () => {
    resumeAudio();
    if (ambientNodeRef.current) return;
    const ctx = audioContextRef.current!;
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    drone.connect(droneGain);
    droneGain.connect(gainNodeRef.current!);
    drone.start();
    ambientNodeRef.current = { drone, wind: drone as any }; 
  };

  const stopAmbient = () => {
    if (ambientNodeRef.current) {
      ambientNodeRef.current.drone.stop();
      ambientNodeRef.current = null;
    }
  };

  const playGhostDialogue = async (text: string, level: number, isFriendly: boolean) => {
    stopDialogue();
    setIsSpeaking(true);
    const audio = await generateSpeech(text, level, isFriendly);
    if (audio) {
      const ctx = audioContextRef.current!;
      const binary = atob(audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channel[i] = dataInt16[i] / 32768.0;
      
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => {
        if (dialogueSourceRef.current === src) {
          setIsSpeaking(false);
          dialogueSourceRef.current = null;
        }
      };
      dialogueSourceRef.current = src;
      src.start();
    } else {
      setIsSpeaking(false);
    }
  };

  const handleLevelStart = async () => {
    resumeAudio();
    playSFX('CLICK');
    setIsLoading(true);
    const currentLvl = LEVELS[state.level - 1];
    try {
      const ghost = await getSpectralEncounter(state.level, currentLvl.title, state.inventory, currentLvl.ghostVibe);
      const roomImg = await generateRoomImage(currentLvl.title, currentLvl.description);
      
      if (roomImg) setRoomImage(roomImg);
      
      setState(prev => ({ ...prev, currentGhost: ghost, status: 'PLAYING' }));
      playSFX('GHOST');
      playGhostDialogue(ghost.dialogue, state.level, ghost.type === 'FRIENDLY');
    } catch (e) {
      console.error(e);
      setState(prev => ({ ...prev, status: 'PLAYING' }));
    } finally {
      setIsLoading(false);
    }
  };

  const nextLevel = () => {
    stopDialogue();
    setConsequence(null);
    setIsTransitioning(true);
    playSFX('DOOR');
    
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        level: prev.level + 1,
        status: 'LEVEL_START',
        currentGhost: undefined
      }));
      setIsTransitioning(false);
    }, 1500);
  };

  const retry = () => {
    stopDialogue();
    setConsequence(null);
    setState(prev => ({ ...prev, status: 'LEVEL_START' }));
  };

  const handleChoice = async (choice: any) => {
    resumeAudio();
    playSFX('CLICK');

    if (choice.itemRequired && !state.inventory.includes(choice.itemRequired)) {
      setConsequence(`A spectral chill paralyzes you! You need the ${choice.itemRequired} to do that.`);
      playSFX('FAILURE');
      setState(prev => ({ ...prev, status: 'INTERACTION' }));
      return;
    }

    setConsequence(choice.consequence);
    const wasCorrect = choice.isCorrect;
    const entryPromise = generateJournalEntry(state.level, LEVELS[state.level - 1].title, choice.text, wasCorrect, state.inventory);

    if (wasCorrect) {
      playSFX('SUCCESS');
      const newInventory = choice.itemFound ? [...state.inventory, choice.itemFound] : state.inventory;
      if (choice.itemFound) playSFX('ITEM');
      
      if (state.level === 10) {
        stopAmbient();
        stopDialogue();
        setTimeout(() => setState(prev => ({ ...prev, status: 'DEAD' })), 4000);
      } else {
        setState(prev => ({ ...prev, status: 'INTERACTION', inventory: newInventory }));
      }
    } else {
      playSFX('FAILURE');
      const newLives = state.lives - 1;
      setState(prev => ({ ...prev, lives: Math.max(0, newLives), status: 'LEVEL_FAILED' }));
    }

    entryPromise.then(entry => {
      setState(prev => ({ ...prev, journal: [...prev.journal, entry] }));
    });
  };

  const getGhostAnimationClass = (level: number, type?: 'FRIENDLY' | 'MALEVOLENT') => {
    return type === 'FRIENDLY' ? 'animate-spectral-drift' : 'animate-monstrous-loom';
  };

  const getShadowIcon = (level: number) => {
    const icons = ['fa-ghost', 'fa-skull', 'fa-mask', 'fa-hat-wizard', 'fa-cloud'];
    return icons[(level - 1) % icons.length];
  };

  const getItemIcon = (itemName: string) => {
    switch(itemName) {
      case 'Rusted Key': return 'fa-key';
      case 'Old Map': return 'fa-map';
      case 'Brass Flashlight': return 'fa-flashlight';
      case 'Winding Key': return 'fa-clock';
      case 'Silver Locket': return 'fa-heart';
      case 'Mirror Shard': return 'fa-diamond';
      case 'Cellar Key': return 'fa-key';
      default: return 'fa-box';
    }
  };

  const startIntro = () => {
    resumeAudio();
    playSFX('CLICK');
    playSFX('HAUNTED_START');
    startAmbient();
    setState(prev => ({ ...prev, status: 'INTRO' }));
  };

  if (state.status === 'MENU') {
    return (
      <div className="game-container fixed inset-0 bg-black flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0a0a1a_0%,_#000000_100%)] animate-pulse opacity-60" />
        <div className="z-10 text-center">
          <h1 className="spooky-font text-6xl md:text-[8rem] text-indigo-600 mb-4 text-glow">
            Ace's Ghostly Chronicles
          </h1>
          <p className="typewriter-font text-indigo-900 tracking-[0.5em] uppercase mb-12 text-sm opacity-60 italic">"The shadows are waiting for you, Ace."</p>
          <button 
            onClick={startIntro}
            className="spooky-font text-4xl text-white border-2 border-indigo-500 px-20 py-5 hover:bg-indigo-900/50 hover:scale-110 transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] tracking-widest"
          >
            STEP INTO THE DARK
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'INTRO') {
    return (
      <div className="game-container fixed inset-0 bg-black flex items-center justify-center p-8">
        <div className="max-w-3xl w-full text-center">
          <p className="typewriter-font text-2xl md:text-3xl text-gray-400 leading-relaxed mb-16 italic">
            "{introStory[introStep].text}"
          </p>
          <button onClick={() => { playSFX('CLICK'); if (introStep < introStory.length - 1) { setIntroStep(introStep + 1); } else { setState(prev => ({ ...prev, status: 'LEVEL_START' })); } }} className="typewriter-font text-indigo-500 hover:text-white text-xl uppercase tracking-widest">
            {introStep === introStory.length - 1 ? "[ PROCEED ]" : "[ CONTINUE ]"}
          </button>
        </div>
      </div>
    );
  }

  const currentLvl = LEVELS[state.level - 1];

  return (
    <div className="game-container fixed inset-0 bg-black text-white overflow-hidden flex flex-col">
      <div className={`fixed inset-y-0 right-0 z-[100] w-full max-w-sm bg-[#080808] border-l border-indigo-950/30 transform transition-transform duration-700 ${isJournalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col p-8 overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h2 className="spooky-font text-4xl text-indigo-500">Journal</h2>
            <button onClick={() => setIsJournalOpen(false)} className="text-zinc-700 hover:text-white p-2">
              <i className="fa-solid fa-xmark text-3xl" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-10 no-scrollbar">
            {state.journal.map((entry, idx) => (
              <div key={idx} className="border-b border-indigo-950/20 pb-8">
                <p className="typewriter-font text-[#a0a0a0] italic">"{entry.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`absolute inset-0 transition-all duration-[3000ms] z-0`}>
        {roomImage ? (
          <img src={roomImage} className="w-full h-full object-cover opacity-60" alt="Room" />
        ) : (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
             <i className="fa-solid fa-house-chimney text-9xl text-black/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
      </div>

      <div className="relative z-30 flex-1 flex flex-col p-8 h-full overflow-hidden">
        <header className="flex justify-between items-start">
          <div className="bg-black/80 p-4 border-l-4 border-indigo-500 rounded-r-xl">
            <h2 className="spooky-font text-3xl text-indigo-500">LEVEL {state.level}</h2>
            <h3 className="typewriter-font text-[9px] uppercase text-zinc-500 tracking-widest">{currentLvl.title}</h3>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-4">
              <button onClick={() => setIsJournalOpen(true)} className="bg-indigo-950/20 border border-indigo-500/20 px-5 py-2.5 rounded-full typewriter-font text-[11px] text-indigo-400">Journal</button>
              <div className="flex gap-2">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <i key={i} className={`fa-solid fa-heart text-2xl ${i < state.lives ? 'text-red-900' : 'text-zinc-950'}`} />
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center relative py-4">
          {isLoading ? (
            <div className="text-center animate-pulse">
              <i className="fa-solid fa-ghost text-8xl text-indigo-950/20 mb-8" />
              <p className="spooky-font text-4xl text-indigo-400">Shifting Realities...</p>
            </div>
          ) : state.status === 'LEVEL_START' ? (
            <div className="text-center">
              <h3 className="spooky-font text-5xl text-white mb-6 uppercase">{currentLvl.title}</h3>
              <button onClick={handleLevelStart} className="spooky-font text-7xl text-indigo-400 hover:text-white transition-all uppercase">[ STEP IN ]</button>
            </div>
          ) : state.status === 'PLAYING' && (
            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center h-full overflow-hidden">
              <div className="md:col-span-4 flex flex-col items-center justify-center">
                {state.currentGhost && (
                  <div className={`relative ${getGhostAnimationClass(state.level, state.currentGhost.type)}`}>
                    <i className={`fa-solid ${getShadowIcon(state.level)} text-[14rem] text-zinc-900`} />
                    <h4 className="spooky-font text-4xl text-indigo-500 mt-4">{state.currentGhost.name}</h4>
                  </div>
                )}
              </div>
              <div className="md:col-span-8 bg-black/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/5 shadow-2xl overflow-y-auto max-h-[90%]">
                <p className="typewriter-font text-lg text-[#b0b0b0] mb-8 leading-relaxed italic">{currentLvl.description}</p>
                <h4 className="spooky-font text-3xl text-indigo-500 mb-8">{currentLvl.mysteryPrompt}</h4>
                <div className="grid grid-cols-1 gap-4">
                  {currentLvl.choices.map((c, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleChoice(c)} 
                      className={`text-left p-6 bg-white/5 border border-white/10 hover:bg-indigo-950/20 transition-all typewriter-font rounded-xl flex items-center justify-between group
                        ${c.itemRequired && !state.inventory.includes(c.itemRequired) ? 'opacity-50 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}
                      `}
                    >
                      <span>{c.text}</span>
                      {c.itemRequired && (
                        <span className="text-[10px] text-indigo-900 uppercase tracking-tighter bg-indigo-500/10 px-2 py-1 rounded">Needs {c.itemRequired}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(state.status === 'INTERACTION' || state.status === 'LEVEL_FAILED') && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90">
              <div className="max-w-3xl w-full text-center p-12 bg-zinc-950 border border-white/5 rounded-[3rem]">
                <p className="typewriter-font text-2xl text-zinc-300 mb-12">"{consequence}"</p>
                <button 
                  onClick={() => state.status === 'INTERACTION' ? nextLevel() : retry()} 
                  className="spooky-font text-5xl text-indigo-500 hover:text-white uppercase"
                >
                  {state.status === 'INTERACTION' ? '[ CONTINUE ]' : '[ TRY AGAIN ]'}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* INVENTORY BAR */}
        <footer className="h-20 flex items-center justify-center gap-6 px-12 border-t border-white/5 bg-black/80">
          <span className="typewriter-font text-[10px] uppercase text-zinc-600 tracking-widest">Ace's Pockets:</span>
          <div className="flex gap-4">
            {state.inventory.length === 0 && <span className="typewriter-font text-zinc-800 italic text-sm">Empty...</span>}
            {state.inventory.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-indigo-950/20 border border-indigo-500/10 rounded-full animate-bounce" style={{ animationDelay: `${idx * 0.1}s` }}>
                <i className={`fa-solid ${getItemIcon(item)} text-indigo-500 text-xs`} />
                <span className="typewriter-font text-[10px] text-zinc-300">{item}</span>
              </div>
            ))}
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes spectral-drift { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-40px) rotate(5deg); } }
        @keyframes monstrous-loom { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        .animate-spectral-drift { animation: spectral-drift 8s ease-in-out infinite; }
        .animate-monstrous-loom { animation: monstrous-loom 6s ease-in-out infinite; }
        
        /* Custom Magic Wand Cursor */
        .game-container { 
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M6 26 L22 10' stroke='%23312e81' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M6 26 L22 10' stroke='%234f46e5' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='24' cy='8' r='4' fill='%23fbbf24'/%3E%3Cpath d='M24 2 L24 14 M18 8 L30 8' stroke='white' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") 24 8, auto;
        }
        
        /* Ensure buttons feel clickable even with custom cursor */
        button, a, [role="button"] {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M6 26 L22 10' stroke='%23312e81' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M6 26 L22 10' stroke='%236366f1' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='24' cy='8' r='5' fill='%23fbbf24'/%3E%3Cpath d='M24 0 L24 16 M16 8 L32 8' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 24 8, pointer;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
