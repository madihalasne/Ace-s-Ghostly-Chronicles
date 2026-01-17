
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
      } catch (e) {
        // Source might already be stopped
      }
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
        osc3.frequency.exponentialRampToValueAtTime(30, now + 4);
        g3.gain.setValueAtTime(0, now);
        g3.gain.linearRampToValueAtTime(0.4, now + 0.5);
        g3.gain.exponentialRampToValueAtTime(0.0001, now + 4);
        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 200;
        osc3.connect(lpf);
        lpf.connect(g3);
        g3.connect(ctx.destination);
        osc3.start(); osc3.stop(now + 4);
        break;
      case 'THUNDER':
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < ctx.sampleRate * 2; i++) output[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 1.5);
        noise.connect(filter);
        const thunderGain = ctx.createGain();
        thunderGain.gain.setValueAtTime(0.5, now);
        thunderGain.gain.exponentialRampToValueAtTime(0.0001, now + 2);
        filter.connect(thunderGain);
        thunderGain.connect(ctx.destination);
        noise.start();
        break;
      case 'RAIN':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(50, now);
        g.gain.setValueAtTime(0.1, now);
        g.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(); osc.stop(now + 1);
        break;
      case 'DOOR':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(40, now + 1.5);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        osc.start(); osc.stop(now + 1.5);
        break;
      case 'CLICK':
        const randFreq = 300 + Math.random() * 500;
        osc.frequency.setValueAtTime(randFreq, now);
        osc.frequency.exponentialRampToValueAtTime(randFreq * 0.5, now + 0.1);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
        break;
      case 'GHOST':
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc.type = 'sine';
        osc2.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 3);
        osc2.frequency.setValueAtTime(224, now);
        osc2.frequency.exponentialRampToValueAtTime(444, now + 3);
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.1, now + 1);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 3);
        osc.connect(g2);
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc.start(); osc.stop(now + 3);
        osc2.start(); osc2.stop(now + 3);
        break;
      case 'ITEM':
        osc.frequency.setValueAtTime(880, now);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        osc.start(); osc.stop(now + 0.2);
        break;
      case 'SUCCESS':
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1);
        osc.frequency.setValueAtTime(659, now + 0.2);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc.start(); osc.stop(now + 0.6);
        break;
      case 'FAILURE':
        osc.type = 'square';
        osc.frequency.setValueAtTime(50, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.8);
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
    const now = ctx.currentTime;

    const windBuffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < windData.length; i++) windData[i] = (Math.random() * 2 - 1) * 0.15;
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;
    
    const windLP = ctx.createBiquadFilter();
    windLP.type = 'lowpass';
    windLP.frequency.setValueAtTime(100, now);
    const windLFO = ctx.createOscillator();
    const windLFOGain = ctx.createGain();
    windLFO.frequency.value = 0.2;
    windLFOGain.gain.value = 80;
    windLFO.connect(windLFOGain);
    windLFOGain.connect(windLP.frequency);
    windLFO.start();

    windSource.connect(windLP);
    windLP.connect(gainNodeRef.current!);

    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const droneLP = ctx.createBiquadFilter();
    droneLP.type = 'lowpass';
    droneLP.frequency.value = 120;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;

    drone.connect(droneLP);
    droneLP.connect(droneGain);
    droneGain.connect(gainNodeRef.current!);
    
    windSource.start();
    drone.start();

    ambientNodeRef.current = { drone, wind: windSource };
  };

  const stopAmbient = () => {
    if (ambientNodeRef.current) {
      ambientNodeRef.current.drone.stop();
      ambientNodeRef.current.wind.stop();
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
    setState(prev => ({
      ...prev,
      status: 'LEVEL_START'
    }));
  };

  const handleChoice = async (choice: any) => {
    resumeAudio();
    playSFX('CLICK');
    if (choice.itemRequired && !state.inventory.includes(choice.itemRequired)) {
      setConsequence(`A spectral chill paralyzes you! You need the ${choice.itemRequired} to proceed through this mystery.`);
      playSFX('FAILURE');
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
    if (type === 'FRIENDLY') {
      const friendlyAnims = ['animate-spectral-drift', 'animate-ethereal-pulse', 'animate-slow-float'];
      return friendlyAnims[level % friendlyAnims.length];
    } else {
      const malevolentAnims = ['animate-monstrous-loom', 'animate-shadow-creep', 'animate-spectral-shift'];
      return malevolentAnims[level % malevolentAnims.length];
    }
  };

  const getShadowIcon = (level: number) => {
    const icons = ['fa-ghost', 'fa-user-ninja', 'fa-user-secret', 'fa-cloud', 'fa-skull', 'fa-mask', 'fa-hat-wizard', 'fa-user-tie', 'fa-person-falling', 'fa-spaghetti-monster-flying'];
    return icons[(level - 1) % icons.length];
  };

  const startIntro = () => {
    resumeAudio();
    playSFX('CLICK');
    playSFX('HAUNTED_START');
    startAmbient();
    playSFX(introStory[0].sound);
    setState(prev => ({ ...prev, status: 'INTRO' }));
  };

  if (state.status === 'MENU') {
    return (
      <div className="game-container fixed inset-0 bg-black flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0a0a1a_0%,_#000000_100%)] animate-pulse opacity-60" />
        <div className="z-10 text-center">
          <h1 className="spooky-font text-6xl md:text-[8rem] text-indigo-600 mb-4 text-glow animate-float drop-shadow-[0_0_30px_rgba(79,70,229,0.7)]">
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
      <div className="game-container fixed inset-0 bg-black flex items-center justify-center p-8 md:p-12">
        <div className="max-w-3xl w-full text-center">
          <div className="mb-12 h-32 flex items-center justify-center">
            {introStep === 0 && <i className="fa-solid fa-bicycle text-zinc-900 text-7xl animate-pulse" />}
            {introStep === 1 && <i className="fa-solid fa-cloud-bolt text-indigo-500 text-8xl animate-bounce" />}
            {introStep === 2 && <i className="fa-solid fa-house-chimney text-zinc-950 text-9xl animate-materialize" />}
            {introStep === 3 && <i className="fa-solid fa-ghost text-indigo-900/40 text-9xl animate-ghost-float" />}
          </div>
          <p key={introStep} className="typewriter-font text-2xl md:text-3xl text-gray-400 leading-relaxed mb-16 animate-fade-in blue-glow italic">
            "{introStory[introStep].text}"
          </p>
          <button onClick={() => { playSFX('CLICK'); if (introStep < introStory.length - 1) { setIntroStep(introStep + 1); playSFX(introStory[introStep + 1].sound); } else { setState(prev => ({ ...prev, status: 'LEVEL_START' })); } }} className="typewriter-font text-indigo-500 hover:text-white transition-all text-xl group uppercase tracking-widest border-b border-indigo-900 pb-2">
            {introStep === introStory.length - 1 ? "[ PROCEED ]" : "[ CONTINUE ]"}
          </button>
        </div>
      </div>
    );
  }

  const currentLvl = LEVELS[state.level - 1];
  const auraClass = state.currentGhost?.type === 'FRIENDLY' ? 'friendly-aura' : 'malevolent-aura';

  return (
    <div className="game-container fixed inset-0 bg-black text-white overflow-hidden select-none flex flex-col">
      {/* DOORWAY TRANSITION */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[1000] bg-black animate-doorway-transition pointer-events-none flex items-center justify-center">
          <div className="w-1 h-1 bg-white blur-[100px] animate-doorway-light" />
        </div>
      )}

      {/* SPECTRAL JOURNAL SIDEBAR */}
      <div className={`fixed inset-y-0 right-0 z-[100] w-full max-w-sm bg-[#080808] border-l border-indigo-950/30 transform transition-transform duration-700 ease-in-out ${isJournalOpen ? 'translate-x-0' : 'translate-x-full'} shadow-[-30px_0_60px_rgba(0,0,0,0.9)]`}>
        <div className="h-full flex flex-col p-8 overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/old-map.png')]" />
          <div className="flex justify-between items-center mb-10 border-b border-indigo-900/20 pb-4">
            <h2 className="spooky-font text-4xl text-indigo-500 tracking-widest uppercase flex items-center gap-3">
              <i className="fa-solid fa-feather-pointed text-2xl" />
              Journal
            </h2>
            <button onClick={() => { playSFX('PAGE_TURN'); setIsJournalOpen(false); }} className="text-zinc-700 hover:text-white transition-colors p-2">
              <i className="fa-solid fa-xmark text-3xl" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-4 space-y-10 no-scrollbar">
            {state.journal.length === 0 ? (
              <div className="flex flex-col items-center gap-6 mt-32 opacity-20">
                 <i className="fa-solid fa-book-open text-6xl text-zinc-800" />
                 <p className="typewriter-font text-zinc-700 text-center italic text-sm">"The pages are silent. Ace's journey is just beginning."</p>
              </div>
            ) : (
              state.journal.map((entry, idx) => (
                <div key={idx} className="relative animate-ink-bleed group border-b border-indigo-950/20 pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="typewriter-font text-[10px] text-indigo-900 font-black tracking-widest">ARCHIVE {entry.level}</span>
                    <span className={`text-[8px] typewriter-font uppercase px-3 py-1 rounded-full border ${entry.mood === 'BRAVE' ? 'border-teal-900/30 bg-teal-950/10 text-teal-600' : entry.mood === 'SCARED' ? 'border-red-900/30 bg-red-950/10 text-red-600' : 'border-indigo-900/30 bg-indigo-950/10 text-indigo-600'}`}>
                      {entry.mood}
                    </span>
                  </div>
                  <p className="typewriter-font text-base text-[#a0a0a0] leading-relaxed italic animate-handwritten-fade font-light">
                    "{entry.content}"
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-indigo-900/10 flex justify-between items-center">
            <p className="typewriter-font text-[9px] text-zinc-800 uppercase tracking-[0.4em]">Ace Blackwood</p>
            <i className="fa-solid fa-skull text-zinc-900 text-xs" />
          </div>
        </div>
      </div>

      <div className={`absolute inset-0 transition-all duration-[3000ms] z-0 ${state.currentGhost ? auraClass : ''}`}>
        {roomImage ? (
          <img src={roomImage} className="w-full h-full object-cover opacity-60 contrast-125 saturate-50 animate-pan-slow" alt="Haunted Room" />
        ) : (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
            <i className="fa-solid fa-house-chimney text-9xl text-black/40 animate-pulse" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-95" />
        <div className="fog-overlay" />
        <div className="absolute inset-0 vignette pointer-events-none" />
      </div>

      <div className="relative z-30 flex-1 flex flex-col p-4 md:p-8 h-full overflow-hidden">
        <header className="flex justify-between items-start shrink-0">
          <div className="bg-black/80 backdrop-blur-xl p-4 border-l-4 border-indigo-500 rounded-r-xl shadow-2xl">
            <h2 className="spooky-font text-2xl md:text-3xl text-indigo-500 tracking-tighter uppercase">LEVEL {state.level}</h2>
            <h3 className="typewriter-font text-[9px] uppercase text-zinc-500 tracking-[0.3em] font-bold truncate max-w-[150px]">{currentLvl.title}</h3>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-4 items-center">
              <button 
                onClick={() => { playSFX('PAGE_TURN'); setIsJournalOpen(true); }}
                className="group flex items-center gap-3 bg-indigo-950/20 hover:bg-indigo-900/40 border border-indigo-500/20 rounded-full px-5 py-2.5 transition-all backdrop-blur-md shadow-xl"
              >
                <i className="fa-solid fa-feather text-indigo-500 group-hover:rotate-12 transition-transform" />
                <span className="typewriter-font text-[11px] text-indigo-400 group-hover:text-white uppercase tracking-[0.2em] font-black">Spectral Journal</span>
                {state.journal.length > 0 && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />}
              </button>

              <div className="flex gap-2">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <i key={i} className={`fa-solid fa-heart text-xl md:text-2xl drop-shadow-[0_0_10px_rgba(255,0,0,0.5)] transition-all duration-[1000ms] ${i < state.lives ? 'text-red-900 animate-pulse' : 'text-zinc-950 scale-75 opacity-20'}`} />
                ))}
              </div>
            </div>
            
            <div className="flex gap-2 bg-indigo-950/10 backdrop-blur-sm p-2 rounded-lg border border-indigo-500/5 shadow-inner max-w-[200px] overflow-hidden">
              <span className="text-[8px] typewriter-font text-indigo-900 self-center font-bold">ITEMS:</span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {state.inventory.length === 0 ? (
                  <span className="text-[8px] text-zinc-900 uppercase self-center tracking-widest italic font-bold">NONE</span>
                ) : (
                  state.inventory.map((item, i) => (
                    <div key={i} className="px-2 py-0.5 bg-indigo-600/5 text-indigo-500 text-[8px] rounded border border-indigo-500/10 uppercase font-black whitespace-nowrap animate-materialize">
                      {item}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center relative py-4 overflow-hidden">
          {isLoading && (
            <div className="text-center animate-fade-in flex flex-col items-center gap-8">
              <div className="relative">
                <i className="fa-solid fa-ghost text-[8rem] text-indigo-950/20 animate-ghost-float" />
                <div className="absolute inset-0 border-2 border-indigo-500/5 rounded-full animate-ping scale-[2]" />
              </div>
              <div className="space-y-4">
                <p className="spooky-font text-4xl text-indigo-400 tracking-[0.3em] italic blue-glow animate-pulse">Shifting Realities...</p>
                <div className="w-48 h-0.5 bg-indigo-950/20 mx-auto rounded-full overflow-hidden">
                   <div className="w-full h-full bg-indigo-500 animate-loading-bar" />
                </div>
              </div>
            </div>
          )}

          {!isLoading && state.status === 'LEVEL_START' && (
            <div className="flex flex-col items-center gap-12 animate-fade-in">
               <div className="bg-black/40 backdrop-blur-xl p-10 rounded-[3rem] border border-white/5 shadow-3xl text-center max-w-xl">
                <h3 className="spooky-font text-5xl text-white mb-6 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{currentLvl.title}</h3>
                <p className="typewriter-font text-base text-zinc-400 leading-relaxed italic font-light">
                  "The Manor whispers your name as you approach the next threshold. Ace, keep your eyes on the shadows..."
                </p>
              </div>
              <button 
                onClick={handleLevelStart} 
                className="group relative flex flex-col items-center"
              >
                <div className="absolute -inset-24 bg-indigo-500/[0.05] blur-[120px] group-hover:bg-indigo-500/20 transition-all rounded-full animate-pulse" />
                <div className="relative spooky-font text-7xl md:text-8xl text-indigo-400/20 group-hover:text-white transition-all tracking-tighter hover:scale-105 duration-[3000ms] text-glow uppercase">
                  [ STEP IN ]
                </div>
              </button>
            </div>
          )}

          {!isLoading && state.status === 'PLAYING' && (
            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center h-full max-h-full overflow-hidden">
              <div className="md:col-span-4 flex flex-col items-center justify-center animate-materialize relative h-48 md:h-full">
                {state.currentGhost && (
                  <div className={`relative w-full max-w-[320px] md:max-w-full aspect-square flex flex-col items-center justify-center ${getGhostAnimationClass(state.level, state.currentGhost.type)}`}>
                    <div className={`absolute inset-0 blur-[80px] opacity-25 rounded-full transition-colors duration-[4000ms] ${state.currentGhost.type === 'FRIENDLY' ? 'bg-indigo-900' : 'bg-red-950'}`} />
                    
                    <div className={`text-[14rem] md:text-[20rem] drop-shadow-[0_0_50px_rgba(0,0,0,1)] transition-all duration-[3000ms] filter blur-[1px] opacity-95 ${state.currentGhost.type === 'FRIENDLY' ? 'text-zinc-900' : 'text-black'}`}>
                      <i className={`fa-solid ${getShadowIcon(state.level)}`} />
                    </div>

                    {isSpeaking && (
                      <div className="absolute -top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                        <div className="flex gap-1.5 items-end h-8">
                          <div className="w-1.5 bg-indigo-600/40 animate-sound-bar-1 rounded-full" />
                          <div className="w-1.5 bg-indigo-600/40 animate-sound-bar-2 rounded-full" />
                          <div className="w-1.5 bg-indigo-600/40 animate-sound-bar-3 rounded-full" />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); playSFX('CLICK'); stopDialogue(); }}
                          className="bg-black/80 backdrop-blur-xl border border-white/5 px-6 py-2 rounded-full text-[10px] uppercase tracking-[0.3em] text-zinc-500 hover:text-white hover:bg-white/5 transition-all shadow-2xl"
                        >
                          Silence Echo
                        </button>
                      </div>
                    )}
                    <div className="absolute top-[95%] left-1/2 -translate-x-1/2 w-full text-center">
                      <h4 className="spooky-font text-3xl md:text-4xl text-indigo-500 blue-glow mb-2 tracking-widest uppercase">{state.currentGhost.name}</h4>
                      <p className="typewriter-font text-[9px] text-zinc-700 uppercase tracking-[0.5em] font-black">{state.currentGhost.type === 'FRIENDLY' ? 'A Helpful Memory' : 'A Vengeful Shadow'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-8 flex flex-col justify-center h-full max-h-full overflow-hidden pb-6">
                <div className="bg-black/40 backdrop-blur-3xl p-8 md:p-12 rounded-[3.5rem] border border-white/5 shadow-3xl animate-slide-up relative flex flex-col h-full max-h-[85%] md:max-h-[95%]">
                  <div className="overflow-y-auto pr-4 no-scrollbar mb-8 shrink">
                    <p className="typewriter-font text-lg md:text-xl text-[#b0b0b0] drop-shadow-md mb-8 leading-relaxed border-l-4 border-indigo-950/40 pl-8 italic font-light">
                      {currentLvl.description}
                    </p>
                    
                    <h4 className="spooky-font text-3xl md:text-4xl text-indigo-500 mb-6 flex items-start gap-6">
                      <i className="fa-solid fa-moon text-sm mt-3 animate-pulse shrink-0 opacity-40" />
                      <span className="leading-tight drop-shadow-lg">{currentLvl.mysteryPrompt}</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:gap-5 shrink-0">
                    {currentLvl.choices.map((c, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleChoice(c)}
                        disabled={c.itemRequired && !state.inventory.includes(c.itemRequired)}
                        className={`group relative text-left p-4 md:p-6 rounded-2xl border transition-all duration-700 typewriter-font text-[11px] md:text-sm overflow-hidden
                          ${c.itemRequired && !state.inventory.includes(c.itemRequired) 
                            ? 'bg-zinc-950/20 border-white/5 text-zinc-900 cursor-not-allowed grayscale' 
                            : 'bg-white/5 border-white/10 hover:bg-indigo-950/20 hover:border-indigo-500/40 text-zinc-500 hover:text-white hover:pl-10'}`}
                      >
                        <div className="flex justify-between items-center gap-6">
                          <span className="flex-1 relative z-10"><span className="text-indigo-600 mr-4 opacity-0 group-hover:opacity-100 transition-all font-black text-xl">»</span> {c.text}</span>
                          {c.itemRequired && !state.inventory.includes(c.itemRequired) && (
                            <span className="text-[8px] md:text-[9px] font-black tracking-widest text-red-950 bg-red-900/10 px-3 py-1 rounded-full border border-red-950/20 uppercase shrink-0">
                              <i className="fa-solid fa-lock mr-2" />LOCKED: {c.itemRequired}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/[0.02] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(state.status === 'INTERACTION' || state.status === 'LEVEL_FAILED') && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl animate-fade-in">
              <div className="max-w-3xl w-full text-center bg-zinc-950/50 p-12 md:p-20 rounded-[5rem] border border-white/5 shadow-3xl animate-slide-up relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/[0.02] animate-pulse" />
                <div className="relative mb-12">
                  <i className={`fa-solid ${state.status === 'INTERACTION' ? 'fa-check-double text-teal-600' : 'fa-skull-crossbones text-red-950'} text-8xl md:text-[10rem] blue-glow animate-pulse`} />
                </div>
                <p className="typewriter-font text-2xl md:text-3xl text-zinc-300 italic mb-16 md:mb-24 leading-relaxed font-light">
                  "{consequence}"
                </p>
                <div className="flex flex-col items-center gap-8">
                  {state.status === 'INTERACTION' ? (
                    <button 
                      onClick={() => { playSFX('CLICK'); nextLevel(); }} 
                      className="spooky-font text-5xl md:text-7xl text-indigo-500 hover:text-white transition-all tracking-[0.4em] hover:scale-105 duration-1000 underline underline-offset-[25px] decoration-indigo-950/50 uppercase"
                    >
                      [ ADVANCE ]
                    </button>
                  ) : state.lives > 0 ? (
                    <button 
                      onClick={() => { playSFX('CLICK'); retry(); }} 
                      className="spooky-font text-5xl md:text-7xl text-red-900/80 hover:text-white transition-all tracking-[0.4em] hover:scale-105 duration-1000 uppercase"
                    >
                      [ TRY AGAIN ]
                    </button>
                  ) : (
                    <button 
                      onClick={() => { playSFX('CLICK'); window.location.reload(); }} 
                      className="spooky-font text-5xl md:text-7xl text-zinc-900 hover:text-white transition-all tracking-[0.4em] uppercase"
                    >
                      [ SURRENDER ]
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-auto shrink-0 flex justify-between items-center text-[9px] md:text-[11px] typewriter-font text-zinc-900 uppercase tracking-[0.8em] font-black opacity-20 border-t border-indigo-950/10 pt-6">
          <div className="flex gap-12">
            <span>Spectral Archives — 1892</span>
            <span>Room: {state.level}/10</span>
          </div>
          <div className="hidden md:block italic tracking-widest">"The shadows know your path, Ace."</div>
        </footer>
      </div>

      {state.status === 'DEAD' && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-12 text-center animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 to-black pointer-events-none opacity-50" />
          <h1 className="spooky-font text-[12rem] md:text-[18rem] text-red-950/40 mb-10 animate-pulse tracking-tighter drop-shadow-[0_0_120px_rgba(153,27,27,1)] uppercase">ETERNITY</h1>
          <p className="typewriter-font text-2xl md:text-4xl text-zinc-800 italic max-w-4xl mb-24 leading-relaxed font-black opacity-40">
            "Ace's footsteps vanish into the stone. The silver locket clicks shut for the final time. He has found his place in the Manor's collection. He is no longer a guest... he is the host."
          </p>
          <button 
            onClick={() => { localStorage.removeItem('ace_ghostly_state'); window.location.reload(); }} 
            className="spooky-font text-6xl md:text-8xl text-zinc-900 hover:text-red-950 transition-all duration-[3000ms] hover:scale-110 tracking-widest uppercase"
          >
            [ REBIRTH ]
          </button>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pan-slow { from { transform: scale(1.1) translateX(-40px); } to { transform: scale(1.1) translateX(40px); } }
        @keyframes materialize { 
          0% { filter: blur(60px) contrast(0) brightness(15); opacity: 0; transform: translateY(40px) scale(0.9); }
          100% { filter: blur(0) contrast(1.2) brightness(1); opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 50% { transform: translateX(0%); } 100% { transform: translateX(100%); } }
        
        @keyframes doorway-transition {
          0% { transform: scale(1); opacity: 0; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(2); opacity: 1; }
        }
        @keyframes doorway-light {
          0% { opacity: 0; scale: 0.1; }
          100% { opacity: 1; scale: 50; }
        }
        .animate-doorway-transition { animation: doorway-transition 1.5s ease-in-out forwards; }
        .animate-doorway-light { animation: doorway-light 1.5s ease-in forwards; }

        @keyframes ink-bleed {
          0% { filter: blur(10px); opacity: 0; transform: scale(0.98); }
          100% { filter: blur(0); opacity: 1; transform: scale(1); }
        }
        @keyframes handwritten-fade {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-ink-bleed { animation: ink-bleed 3s ease-out forwards; }
        .animate-handwritten-fade { animation: handwritten-fade 2s ease-out 1s forwards; opacity: 0; }

        @keyframes spectral-drift {
          0%, 100% { transform: translate(-40px, 0) rotate(-3deg) scale(1); opacity: 0.6; }
          50% { transform: translate(40px, -60px) rotate(3deg) scale(1.15); opacity: 0.9; }
        }
        @keyframes ethereal-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.4; filter: blur(6px); }
          50% { transform: scale(1.15); opacity: 0.85; filter: blur(2px); }
        }
        @keyframes slow-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-70px) rotate(8deg); }
        }
        @keyframes monstrous-loom {
          0%, 100% { transform: scale(1) translateY(0); filter: brightness(1) blur(3px); }
          50% { transform: scale(1.4) translateY(-30px); filter: brightness(0.4) blur(0px); }
        }
        @keyframes shadow-creep {
          0%, 100% { transform: translate(0, 0) skewX(0deg); opacity: 0.5; }
          50% { transform: translate(-60px, 20px) skewX(15deg); opacity: 0.95; }
        }
        @keyframes spectral-shift {
          0%, 100% { transform: translateX(0) scale(1); filter: blur(2px); }
          30% { transform: translateX(70px) scale(1.1); filter: blur(6px); }
          70% { transform: translateX(-70px) scale(0.9); filter: blur(10px); }
        }

        .animate-spectral-drift { animation: spectral-drift 12s ease-in-out infinite; }
        .animate-ethereal-pulse { animation: ethereal-pulse 7s ease-in-out infinite; }
        .animate-slow-float { animation: slow-float 15s ease-in-out infinite; }
        .animate-monstrous-loom { animation: monstrous-loom 10s ease-in-out infinite; }
        .animate-shadow-creep { animation: shadow-creep 11s ease-in-out infinite; }
        .animate-spectral-shift { animation: spectral-shift 18s ease-in-out infinite; }
        
        .animate-fade-in { animation: fade-in 3s ease-out forwards; }
        .animate-slide-up { animation: slide-up 2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pan-slow { animation: pan-slow 80s ease-in-out infinite alternate; }
        .animate-materialize { animation: materialize 5s cubic-bezier(0.2, 0, 0, 1) forwards; }
        .animate-loading-bar { animation: loading-bar 2s ease-in-out infinite; }
        
        @keyframes sound-bar-1 { 0%, 100% { height: 6px; } 50% { height: 24px; } }
        @keyframes sound-bar-2 { 0%, 100% { height: 10px; } 50% { height: 32px; } }
        @keyframes sound-bar-3 { 0%, 100% { height: 5px; } 50% { height: 18px; } }
        .animate-sound-bar-1 { animation: sound-bar-1 0.5s ease-in-out infinite; }
        .animate-sound-bar-2 { animation: sound-bar-2 0.4s ease-in-out infinite; }
        .animate-sound-bar-3 { animation: sound-bar-3 0.6s ease-in-out infinite; }

        .friendly-aura { box-shadow: inset 0 0 200px rgba(49, 46, 129, 0.4); }
        .malevolent-aura { box-shadow: inset 0 0 200px rgba(69, 10, 10, 0.5); }
        
        .fog-overlay {
          position: absolute;
          inset: 0;
          background: url('https://www.transparenttextures.com/patterns/dust.png');
          opacity: 0.15;
          mix-blend-mode: overlay;
          animation: pan-slow 120s linear infinite reverse;
        }

        .blue-glow { text-shadow: 0 0 30px rgba(79, 70, 229, 1), 0 0 60px rgba(79, 70, 229, 0.4); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* MAGIC WAND CURSOR */
        .game-container {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none'><path d='M3 21L12 12' stroke='%236366f1' stroke-width='2' stroke-linecap='round'/><path d='M12 12L18 6' stroke='%23818cf8' stroke-width='2' stroke-linecap='round'/><path d='M18 6L21 3' stroke='white' stroke-width='2' stroke-linecap='round'/><circle cx='21' cy='3' r='1.5' fill='white'><animate attributeName='opacity' values='0;1;0' dur='1s' infinite='true'/></circle></svg>") 0 24, auto;
        }
        button, [role="button"], a {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none'><path d='M3 21L12 12' stroke='%236366f1' stroke-width='2' stroke-linecap='round'/><path d='M12 12L18 6' stroke='%23818cf8' stroke-width='2' stroke-linecap='round'/><path d='M18 6L21 3' stroke='white' stroke-width='2' stroke-linecap='round'/><circle cx='21' cy='3' r='2.5' fill='white'><animate attributeName='r' values='1;3;1' dur='0.5s' repeatCount='indefinite'/></circle></svg>") 0 24, pointer;
        }
      `}</style>
    </div>
  );
};

export default App;
