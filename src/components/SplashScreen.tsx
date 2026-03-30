import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'approach' | 'hit' | 'shatter' | 'logo'>('approach');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timers = [
      setTimeout(() => setPhase('hit'), 1000),
      setTimeout(() => setPhase('shatter'), 1350),
      setTimeout(() => setPhase('logo'), 1650),
      setTimeout(() => {
        document.body.style.overflow = 'auto';
        onComplete();
      }, 5500),
    ];
    return () => {
      document.body.style.overflow = 'auto';
      timers.forEach(t => clearTimeout(t));
    };
  }, [onComplete]);

  // Generate random shards for the glass break effect
  const shards = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 1800,
    y: (Math.random() - 0.5) * 1800,
    rotate: Math.random() * 1440,
    size: Math.random() * 180 + 40,
    delay: Math.random() * 0.08,
  }));

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      animate={phase === 'shatter' ? {
        x: [0, -20, 20, -20, 20, 0],
        y: [0, 10, -10, 10, -10, 0],
      } : {}}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 w-screen h-screen h-[100dvh] bg-brutal-black z-[1000] flex flex-col items-center justify-center overflow-hidden font-sans select-none"
    >
      {/* Fullscreen Button (Optional Hint) */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        whileHover={{ opacity: 0.8 }}
        onClick={() => {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }}
        className="absolute top-6 right-6 text-[10px] uppercase tracking-[0.2em] text-white/50 border border-white/10 px-3 py-1 rounded-full hover:bg-white/5 transition-all z-[1001]"
      >
        Go Fullscreen
      </motion.button>

      <div className="relative w-full h-full flex items-center justify-center">
        
        {/* Impact Flash */}
        <AnimatePresence>
          {phase === 'hit' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0, 2, 3] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, times: [0, 0.2, 1] }}
              className="absolute z-[55] w-64 h-64 bg-white rounded-full blur-3xl pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* The Ball Animation - Continuous */}
        {(phase === 'approach' || phase === 'hit') && (
          <motion.div
            initial={{ scale: 0.05, y: -400, x: 0, opacity: 0 }}
            animate={
              phase === 'approach' 
                ? { scale: 0.5, y: 180, x: 40, opacity: 1, rotate: 360 } 
                : { scale: 50, y: 0, x: -150, opacity: 1, rotate: 1440 }
            }
            transition={
              phase === 'approach' 
                ? { duration: 1, ease: "easeOut" } 
                : { duration: 0.35, ease: [0.45, 0, 0.55, 1] }
            }
            className="absolute z-[60]"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 via-red-700 to-red-950 rounded-full shadow-[0_0_60px_rgba(220,38,38,1)] border border-white/30 relative overflow-hidden">
              <div className="absolute top-1/2 left-0 w-full h-2 bg-[#f1f1f1]/40 -translate-y-1/2 flex flex-col justify-between py-[2px]">
                 <div className="h-[1px] w-full bg-white/20" />
                 <div className="h-[1px] w-full bg-white/20" />
              </div>
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/40 -translate-y-[1px]" />
              <div className="absolute top-2 left-4 w-5 h-5 bg-white/40 rounded-full blur-[3px]" />
            </div>
          </motion.div>
        )}

        {/* The Bat Animation - Continuous */}
        {(phase === 'approach' || phase === 'hit') && (
          <motion.div
            initial={{ rotate: -110, x: 500, y: 300, opacity: 0 }}
            animate={
              phase === 'approach'
                ? { rotate: -60, x: 250, y: 250, opacity: 1 }
                : { rotate: 80, x: -300, y: 150, opacity: 1 }
            }
            transition={{ 
              duration: phase === 'approach' ? 1 : 0.4, 
              ease: phase === 'approach' ? "easeOut" : "anticipate" 
            }}
            className="absolute z-50 origin-[50%_0%]"
          >
            <div className="relative w-28 h-96 bg-gradient-to-b from-[#e9c46a] to-[#d4a373] rounded-b-2xl border-x-4 border-b-8 border-[#8b5e34] shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
              {/* Handle */}
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-10 h-40 bg-[#1a1a1a] rounded-t-full border-x-4 border-t-4 border-black">
                <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(transparent,transparent_4px,black_4px,black_8px)]" />
              </div>
              {/* Brand Sticker */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-16 h-24 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
                <span className="text-[10px] font-black text-neon-cyan/60 rotate-90 tracking-[0.3em] uppercase">Legend</span>
              </div>
              {/* Wood Grain Detail */}
              <div className="absolute inset-y-12 inset-x-4 border-l border-white/5 rounded-full blur-[0.5px]" />
            </div>
          </motion.div>
        )}

        {/* Glass Shatter Effect */}
        {phase === 'shatter' && (
          <div className="absolute inset-0 flex items-center justify-center z-40">
            <motion.div 
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 1.8, 1] }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 bg-white z-50"
            />
            {shards.map((shard) => (
              <motion.div
                key={shard.id}
                initial={{ scale: 0, opacity: 1, x: 0, y: 0, rotate: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 0, 
                  x: shard.x, 
                  y: shard.y, 
                  rotate: shard.rotate 
                }}
                transition={{ duration: 1.8, ease: "easeOut", delay: shard.delay }}
                className="absolute bg-white/10 backdrop-blur-3xl border border-white/70 shadow-[0_0_40px_rgba(255,255,255,0.5)]"
                style={{
                  width: shard.size,
                  height: shard.size,
                  clipPath: `polygon(${Math.random()*100}% 0%, 0% ${Math.random()*100}%, 100% 100%)`,
                }}
              />
            ))}
          </div>
        )}

        {/* App Logo Appearance */}
        <AnimatePresence>
          {phase === 'logo' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4, y: 60, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ 
                type: "spring",
                stiffness: 120,
                damping: 12,
                delay: 0.1
              }}
              className="flex flex-col items-center z-30 px-6 w-full"
            >
              <div className="relative group max-w-full flex flex-col items-center">
                <motion.div 
                  className="absolute -inset-24 bg-neon-cyan/25 blur-[140px] rounded-full animate-pulse"
                />
                <motion.h1 
                  className="text-[16vw] md:text-[10rem] font-black italic tracking-tighter text-white drop-shadow-[0_0_60px_rgba(0,255,255,0.8)] relative text-center leading-none"
                  style={{ WebkitTextStroke: '1.5px rgba(0,255,255,0.6)' }}
                >
                  <span className="text-neon-cyan">My</span>Cricket
                </motion.h1>
                
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.9, ease: "circOut" }}
                  className="h-[5px] bg-neon-cyan mt-10 shadow-[0_0_30px_rgba(0,255,255,1)] w-full max-w-lg"
                />
                <div className="flex justify-between mt-6 px-4 w-full max-w-lg">
                  <div className="h-1.5 w-20 bg-neon-cyan/40" />
                  <div className="h-1.5 w-48 bg-neon-cyan/60" />
                  <div className="h-1.5 w-16 bg-neon-cyan/40" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.8, duration: 1.2 }}
        className="absolute bottom-12 flex flex-col items-center gap-4"
      >
        <div className="h-[1px] w-20 bg-white/20 mb-1" />
        <span className="text-[12px] uppercase tracking-[0.7em] text-white/40 font-mono font-bold">Powered by</span>
        <span className="text-2xl font-black tracking-[0.3em] text-white/95 bg-white/5 px-8 py-3 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md">
          ATHER-X <span className="text-neon-cyan">PRO</span>
        </span>
      </motion.div>

      {/* Background Atmosphere */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)`,
             backgroundSize: '80px 80px' 
           }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brutal-black via-transparent to-brutal-black pointer-events-none" />
    </motion.div>
  );
}
