import React, { useMemo } from 'react';
import type { Match } from '../types';
import { Circle, TrendingUp } from 'lucide-react';

export default function LiveScoreboard({ match }: { match: Match }) {
  const balls = match.balls || [];
  
  const stats = useMemo(() => {
    let totalRuns = 0;
    let totalWickets = 0;
    let totalBalls = 0;
    let extras = 0;

    const currentInningsBalls = balls.filter(b => b.innings_no === match.current_innings);

    currentInningsBalls.forEach(b => {
      totalRuns += b.runs + b.extra_runs;
      if (b.wicket_type) totalWickets++;
      if (b.extra_type !== 'wide' && b.extra_type !== 'noball') {
        totalBalls++;
      }
      extras += b.extra_runs;
    });

    const overs = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    const runRate = totalBalls > 0 ? (totalRuns / (totalBalls / 6)).toFixed(2) : '0.00';
    
    let target = 0;
    if (match.current_innings === 2) {
      const firstInningsRuns = balls.filter(b => b.innings_no === 1).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
      target = firstInningsRuns + 1;
    }

    return { totalRuns, totalWickets, overs, remainingBalls, runRate, extras, target };
  }, [balls, match]);

  return (
    <div className="min-h-screen bg-brutal-black text-white p-6">
      <h1 className="font-serif text-4xl font-bold text-neon-cyan mb-8">Live Scoreboard</h1>
      <div className="hardware-widget p-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-serif italic text-xl text-neon-cyan/80">{match.team_a_name} vs {match.team_b_name}</h3>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-8xl font-black tracking-tighter text-white">{stats.totalRuns}</span>
              <span className="text-5xl font-light text-white/40">/ {stats.totalWickets}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest mb-1">Overs</div>
            <div className="text-4xl font-mono font-bold">{stats.overs}.{stats.remainingBalls}</div>
          </div>
        </div>
        {match.current_innings === 2 && (
          <div className="mt-4 text-neon-cyan font-mono">Target: {stats.target}</div>
        )}
      </div>
    </div>
  );
}
