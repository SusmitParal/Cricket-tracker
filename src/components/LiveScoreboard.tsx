import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Match, Ball } from '../types';
import { Circle, TrendingUp, Plus, Undo2, Share2 } from 'lucide-react';

export default function LiveScoreboard({ match, addBall, undoLast, onWicket, onDeclare, onShare, onBack }: { match: Match, addBall: (matchId: string, currentInnings: number, totalBalls: number, batsmanId: string | null, bowlerId: string | null, ballData: Partial<Ball>, batsmanName?: string, bowlerName?: string) => void, undoLast: (matchId: string, balls: Ball[]) => void, onWicket: () => void, onDeclare: () => void, onShare: () => void, onBack?: () => void }) {
  const balls = useLiveQuery(() => db.balls.where('match_id').equals(match.id).toArray(), [match.id]) || [];
  const [pendingExtra, setPendingExtra] = useState<'wide' | 'noball' | 'bye' | 'legbye' | null>(null);
  
  const currentBatsmanId = match.current_striker_id;
  const nonStrikerId = match.non_striker_id;
  const currentBowlerId = match.current_bowler_id;

  const battingPlayers = match.current_innings % 2 !== 0 ? match.players?.team_a : match.players?.team_b;
  const bowlingPlayers = match.current_innings % 2 !== 0 ? match.players?.team_b : match.players?.team_a;

  const handleAddBall = (ballData: Partial<Ball>) => {
    const batsmanName = battingPlayers?.find(p => p.id === currentBatsmanId)?.name;
    const bowlerName = bowlingPlayers?.find(p => p.id === currentBowlerId)?.name;
    addBall(match.id, match.current_innings, stats.totalBalls, currentBatsmanId || null, currentBowlerId || null, ballData, batsmanName, bowlerName);
  };
  const handleUndo = () => {
    undoLast(match.id, balls);
  };
  
  const stats = useMemo(() => {
    let totalRuns = 0;
    let totalWickets = 0;
    let totalBalls = 0;
    let extras = 0;

    const currentInningsBalls = balls.filter(b => b.innings_no === match.current_innings);

    currentInningsBalls.forEach(b => {
      totalRuns += Number(b.runs || 0) + Number(b.extra_runs || 0);
      if (b.wicket_type) totalWickets++;
      if (b.extra_type !== 'wide' && b.extra_type !== 'noball') {
        totalBalls++;
      }
      extras += Number(b.extra_runs || 0);
    });

    const overs = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    const runRate = totalBalls > 0 ? (totalRuns / (totalBalls / 6)).toFixed(2) : '0.00';
    
    let target = 0;
    if (match.current_innings === 2) {
      const firstInningsRuns = balls.filter(b => b.innings_no === 1).reduce((sum, b) => sum + Number(b.runs || 0) + Number(b.extra_runs || 0), 0);
      target = firstInningsRuns + 1;
    }

    const playerStats = calculatePlayerStats(balls, [...(battingPlayers || []), ...(bowlingPlayers || [])]);

    return { totalRuns, totalWickets, overs, remainingBalls, runRate, extras, target, totalBalls, playerStats };
  }, [balls, match, battingPlayers, bowlingPlayers]);

  const striker = battingPlayers?.find(p => p.id === currentBatsmanId);
  const nonStriker = battingPlayers?.find(p => p.id === nonStrikerId);
  const bowler = bowlingPlayers?.find(p => p.id === currentBowlerId);

  return (
    <div className="min-h-screen bg-brutal-black text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neon-cyan">
              <Undo2 size={24} />
            </button>
          )}
          <h1 className="font-serif text-4xl font-bold text-neon-cyan">Live Scoreboard</h1>
        </div>
        <button 
          onClick={onShare}
          className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-neon-cyan border border-neon-cyan/30 px-4 py-2 rounded-full hover:bg-neon-cyan hover:text-brutal-black transition-all"
        >
          <Share2 size={12} /> Share Live URL
        </button>
      </div>
      <div className="hardware-widget p-8 mb-8 relative overflow-hidden">
        <div className="flex justify-between items-start z-10 relative">
          <div>
            <div className="flex items-center gap-2">
              {match.team_a_icon && <span className="text-2xl">{match.team_a_icon}</span>}
              <h3 className="font-serif italic text-xl text-neon-cyan/80">{match.team_a_name} vs {match.team_b_name}</h3>
              {match.team_b_icon && <span className="text-2xl">{match.team_b_icon}</span>}
            </div>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-8xl font-black tracking-tighter text-white">{stats.totalRuns}</span>
              <span className="text-5xl font-light text-white/40">/ {stats.totalWickets}</span>
            </div>
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
                  <span className="font-bold truncate mr-2 text-neon-cyan">{striker?.name || 'Striker'} *</span>
                  <span className="text-neon-cyan font-mono">
                    {stats.playerStats[String(currentBatsmanId)]?.runs || 0} ({stats.playerStats[String(currentBatsmanId)]?.balls || 0})
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10 opacity-60">
                  <span className="font-bold truncate mr-2">{nonStriker?.name || 'Non-Striker'}</span>
                  <span className="font-mono">
                    {stats.playerStats[String(nonStrikerId)]?.runs || 0} ({stats.playerStats[String(nonStrikerId)]?.balls || 0})
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
                  <span className="font-bold truncate mr-2">{bowler?.name || 'Bowler'}</span>
                  <div className="text-right">
                    <div className="text-neon-cyan font-mono leading-none">
                      {stats.playerStats[String(currentBowlerId)]?.wickets || 0} - {stats.playerStats[String(currentBowlerId)]?.runsConceded || 0}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">
                      {Math.floor((stats.playerStats[String(currentBowlerId)]?.ballsBowled || 0) / 6)}.{ (stats.playerStats[String(currentBowlerId)]?.ballsBowled || 0) % 6 } ov
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest mb-1">Overs</div>
            <div className="text-4xl font-mono font-bold">{stats.overs}.{stats.remainingBalls}</div>
            <div className="text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest mt-4 mb-1">Run Rate</div>
            <div className="text-2xl font-mono text-neon-cyan">{stats.runRate}</div>
          </div>
        </div>
        {match.current_innings === 2 && (
          <div className="mt-4 text-neon-cyan font-mono bg-neon-cyan/10 p-2 rounded border border-neon-cyan/20 inline-block">
            Target: {stats.target}
          </div>
        )}
      </div>

      {/* Scoring Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2 md:col-span-3 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 6].map(r => (
            <button 
              key={r}
              onClick={() => {
                if (pendingExtra) {
                  if (pendingExtra === 'wide') {
                      handleAddBall({ runs: 0, extra_runs: r + 1, extra_type: 'wide' });
                  } else if (pendingExtra === 'noball') {
                      handleAddBall({ runs: r, extra_runs: 1, extra_type: 'noball' });
                  } else {
                      handleAddBall({ runs: 0, extra_runs: r, extra_type: pendingExtra });
                  }
                  setPendingExtra(null);
                } else {
                  handleAddBall({ runs: r });
                }
              }}
              className={`h-20 border rounded-xl font-black text-3xl transition-all shadow-lg active:scale-95 ${
                pendingExtra ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan' : 'bg-white/5 border-white/10 hover:bg-neon-cyan hover:text-brutal-black hover:border-neon-cyan'
              }`}
            >
              {pendingExtra ? `+${r}` : r}
            </button>
          ))}
          <button 
            onClick={() => {
              if (pendingExtra === 'wide') {
                handleAddBall({ runs: 0, extra_runs: 1, extra_type: 'wide' });
                setPendingExtra(null);
              } else {
                setPendingExtra('wide');
              }
            }}
            className={`h-20 rounded-xl font-bold text-sm uppercase tracking-tighter transition-all border ${
              pendingExtra === 'wide' ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-orange-500/10 border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white'
            }`}
          >
            Wide
          </button>
          <button 
            onClick={() => {
              if (pendingExtra === 'noball') {
                handleAddBall({ runs: 0, extra_runs: 1, extra_type: 'noball' });
                setPendingExtra(null);
              } else {
                setPendingExtra('noball');
              }
            }}
            className={`h-20 rounded-xl font-bold text-sm uppercase tracking-tighter transition-all border ${
              pendingExtra === 'noball' ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-blue-500/10 border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white'
            }`}
          >
            No Ball
          </button>
          <button 
            onClick={() => setPendingExtra(pendingExtra ? null : 'wide')}
            className={`h-20 rounded-xl flex items-center justify-center transition-all border ${
              pendingExtra ? 'bg-neon-cyan text-brutal-black border-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'bg-white/5 border-white/10 hover:border-neon-cyan text-neon-cyan'
            }`}
          >
            <Plus size={24} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onWicket}
            className="flex-1 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-lg hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all active:scale-95"
          >
            WICKET
          </button>
          <button 
            onClick={handleUndo}
            className="h-14 border border-white/20 rounded-xl flex items-center justify-center gap-2 text-xs uppercase font-bold hover:bg-white/10 transition-all"
          >
            <Undo2 size={16} /> Undo Last
          </button>
        </div>
      </div>
    </div>
  );
}

function calculatePlayerStats(balls: Ball[], players: any[]) {
  const stats: Record<string, any> = {};
  players.forEach(p => {
    stats[String(p.id)] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0 };
  });

  balls.forEach(b => {
    const bId = b.batsman_id ? String(b.batsman_id) : null;
    const bowId = b.bowler_id ? String(b.bowler_id) : null;
    if (bId && stats[bId]) {
      stats[bId].runs += Number(b.runs || 0);
      if (b.extra_type !== 'wide') stats[bId].balls += 1;
    }
    if (bowId && stats[bowId]) {
      stats[bowId].runsConceded += (Number(b.runs || 0) + Number(b.extra_runs || 0));
      if (b.extra_type !== 'wide' && b.extra_type !== 'noball') stats[bowId].ballsBowled += 1;
      if (b.wicket_type && b.wicket_type !== 'Run Out') stats[bowId].wickets += 1;
    }
  });

  return stats;
}
