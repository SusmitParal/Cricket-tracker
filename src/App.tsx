/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy,
  Users, 
  History as HistoryIcon, 
  Plus, 
  ChevronRight, 
  Undo2, 
  Circle, 
  AlertCircle,
  TrendingUp,
  User,
  Settings2
} from 'lucide-react';
import type { Match, Ball, Player } from './types';
import History from './components/History';

export default function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedMatch = useMemo(() => 
    matches.find(m => m.id === selectedMatchId), 
    [matches, selectedMatchId]
  );

  useEffect(() => {
    if (selectedMatchId && !selectedMatch?.players) {
      fetch(`/api/matches/${selectedMatchId}`)
        .then(res => res.json())
        .then(data => {
          setMatches(prev => prev.map(m => m.id === selectedMatchId ? data : m));
        });
    }
  }, [selectedMatchId, selectedMatch?.players]);

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'MATCH_CREATED') {
        setMatches(prev => [data.match, ...prev]);
      } else if (data.type === 'BALL_ADDED' || data.type === 'BALL_REMOVED') {
        setMatches(prev => prev.map(m => 
          m.id === Number(data.matchId) ? data.fullMatch : m
        ));
      } else if (data.type === 'MATCH_UPDATED') {
        setMatches(prev => prev.map(m => m.id === data.match.id ? data.match : m));
      }
    };

    return () => ws.close();
  }, []);

  if (showHistory) {
    return (
      <div className="min-h-screen bg-brutal-black text-white">
        <button onClick={() => setShowHistory(false)} className="p-6 text-neon-cyan">Back</button>
        <History matches={matches} />
      </div>
    );
  }

  const createMatch = async (teamAId: number, teamBId: number, overs: number, wickets: number) => {
    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_a_id: teamAId, team_b_id: teamBId, total_overs: overs, wickets }),
    });
    if (!res.ok) {
      const error = await res.json();
      console.error('Failed to create match:', error);
      alert(`Failed to create match: ${error.error || 'Unknown error'}`);
      return;
    }
    const newMatch = await res.json();
    setSelectedMatchId(newMatch.id);
    setShowSetup(false);
  };

  const createTournament = async (tournament: any) => {
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournament),
      });
      if (!res.ok) throw new Error('Failed to create tournament');
      const data = await res.json();
      
      // Generate schedule
      const schedRes = await fetch(`/api/tournaments/${data.id}/schedule`, { method: 'POST' });
      if (!schedRes.ok) {
        const error = await schedRes.json();
        throw new Error(`Failed to generate schedule: ${error.error || 'Unknown error'}`);
      }
      
      alert('Tournament created and schedule generated successfully!');
    } catch (err) {
      console.error('Failed to create tournament:', err);
      alert(`Failed to create tournament: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [standings, setStandings] = useState<any[]>([]);

  useEffect(() => {
    if (selectedTournamentId) {
      fetch(`/api/tournaments/${selectedTournamentId}/standings`)
        .then(res => res.json())
        .then(data => setStandings(data));
    }
  }, [selectedTournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brutal-black">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Circle className="w-8 h-8 text-neon-cyan" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4 md:p-8">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-neon-cyan/30 pb-4 gap-4">
        <div>
          <h1 className="font-serif text-6xl font-bold tracking-tighter text-neon-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">CRICKET</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan/60">Pro Team Tracker v2.0</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 border border-neon-cyan/50 text-neon-cyan px-4 py-2 rounded-full hover:bg-neon-cyan hover:text-brutal-black transition-all text-xs font-bold uppercase tracking-wider"
          >
            <HistoryIcon size={14} />
            History
          </button>
          <button 
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 bg-neon-cyan text-brutal-black px-5 py-2 rounded-full hover:brightness-110 transition-all text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,255,0.3)]"
          >
            <Plus size={16} />
            New Match
          </button>
        </div>
      </header>

      <main>
        {selectedMatchId ? (
          <MatchDashboard 
            match={selectedMatch!} 
            onBack={() => {
              setSelectedMatchId(null);
              fetchMatches();
            }} 
          />
        ) : (
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-6">
                <HistoryIcon size={16} className="text-neon-cyan" />
                <h2 className="font-serif italic text-lg text-neon-cyan/80">Live & Recent</h2>
              </div>
              
              {matches
                .filter(m => m.status === 'ongoing' || (Date.now() - new Date(m.created_at).getTime() < 86400000))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 1)
                .length === 0 ? (
                <div className="border border-dashed border-neon-cyan/20 rounded-2xl p-16 text-center">
                  <p className="opacity-40 font-serif italic text-lg">The field is empty. Start a match.</p>
                </div>
              ) : (
                <div className="border-t border-white/10">
                  {matches
                    .filter(m => m.status === 'ongoing' || (Date.now() - new Date(m.created_at).getTime() < 86400000))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 1)
                    .map(match => (
                    <div 
                      key={match.id} 
                      onClick={() => setSelectedMatchId(match.id)}
                      className="data-grid-row group"
                    >
                      <div className="flex items-center justify-center">
                        <Circle size={12} className={match.status === 'ongoing' ? 'text-neon-cyan animate-pulse' : 'opacity-20'} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-tight group-hover:text-brutal-black">{match.team_a_name} vs {match.team_b_name}</span>
                        <span className="text-[9px] opacity-40 uppercase font-mono tracking-widest group-hover:text-brutal-black/60">
                          {match.tournament_name || 'Friendly'} • {new Date(match.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center data-value text-neon-cyan group-hover:text-brutal-black">
                        {match.total_overs} OVERS
                      </div>
                      <div className="flex items-center justify-end">
                        <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showSetup && (
          <MatchSetupModal 
            onClose={() => setShowSetup(false)} 
            onSubmit={createMatch}
          />
        )}
      </AnimatePresence>
    </div>
  );
}




function MatchSetupModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (a: number, b: number, o: number, w: number) => void }) {
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [overs, setOvers] = useState('20');
  const [wickets, setWickets] = useState('10');
  const [step, setStep] = useState<'match_type' | 'team_a' | 'players_a' | 'team_b' | 'players_b' | 'overs' | 'wickets'>('match_type');
  const [matchType, setMatchType] = useState<'test' | 'odi' | 't20' | 'customize'>('t20');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardTarget, setKeyboardTarget] = useState<'teamA' | 'teamB' | 'player'>('teamA');

  useEffect(() => {
    if (matchType === 'test') setOvers('90');
    else if (matchType === 'odi') setOvers('50');
    else if (matchType === 't20') setOvers('20');
  }, [matchType]);

  const handleNext = () => {
    if (step === 'match_type') setStep('team_a');
    else if (step === 'team_a') setStep('players_a');
    else if (step === 'players_a') setStep('team_b');
    else if (step === 'team_b') setStep('players_b');
    else if (step === 'players_b') {
      if (matchType === 'customize') setStep('wickets');
      else setStep('overs');
    }
    else if (step === 'wickets') setStep('overs');
  };

  const handleBack = () => {
    if (step === 'team_a') setStep('match_type');
    else if (step === 'players_a') setStep('team_a');
    else if (step === 'team_b') setStep('players_a');
    else if (step === 'players_b') setStep('team_b');
    else if (step === 'overs') {
      if (matchType === 'customize') setStep('wickets');
      else setStep('players_b');
    }
    else if (step === 'wickets') setStep('players_b');
  };

  const addPlayer = () => {
    if (!currentPlayerName) return;
    if (step === 'players_a') {
      setTeamAPlayers([...teamAPlayers, currentPlayerName]);
    } else {
      setTeamBPlayers([...teamBPlayers, currentPlayerName]);
    }
    setCurrentPlayerName('');
  };

  const handleSubmit = async () => {
    try {
      // 1. Create Team A
      const resA = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamAName }),
      });
      if (!resA.ok) throw new Error('Failed to create Team A');
      const teamA = await resA.json();
      
      // 2. Add Team A Players
      for (const p of teamAPlayers) {
        const res = await fetch(`/api/teams/${teamA.id}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: p, is_captain: false }),
        });
        if (!res.ok) throw new Error('Failed to add player to Team A');
      }

      // 3. Create Team B
      const resB = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamBName }),
      });
      if (!resB.ok) throw new Error('Failed to create Team B');
      const teamB = await resB.json();

      // 4. Add Team B Players
      for (const p of teamBPlayers) {
        const res = await fetch(`/api/teams/${teamB.id}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: p, is_captain: false }),
        });
        if (!res.ok) throw new Error('Failed to add player to Team B');
      }

      // 5. Create Match
      onSubmit(teamA.id, teamB.id, Number(overs), Number(wickets));
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert(`Failed to start match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-brutal-black border border-neon-cyan p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,255,255,0.2)]"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-serif text-4xl italic text-neon-cyan">Match Setup</h2>
          <div className="flex gap-1">
            {['match_type', 'team_a', 'players_a', 'team_b', 'players_b', 'wickets', 'overs'].map((s, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${step === s ? 'bg-neon-cyan' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="min-h-[300px]">
          {step === 'match_type' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <label className="block text-[10px] uppercase font-mono mb-4 text-neon-cyan/60 tracking-widest">Select Match Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['test', 'odi', 't20', 'customize'].map(m => (
                  <button 
                    key={m}
                    onClick={() => setMatchType(m as any)}
                    className={`py-4 rounded-xl border font-mono font-bold transition-all ${
                      matchType === m ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {(step === 'team_a' || step === 'team_b') && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <label className="block text-[10px] uppercase font-mono mb-4 text-neon-cyan/60 tracking-widest">
                {step === 'team_a' ? 'Batting Team Name' : 'Bowling Team Name'}
              </label>
              <div 
                onClick={() => {
                  setKeyboardTarget(step === 'team_a' ? 'teamA' : 'teamB');
                  setShowKeyboard(true);
                }}
                className="w-full bg-white/5 border-b border-neon-cyan/30 py-4 font-bold text-2xl cursor-pointer min-h-[64px]"
              >
                {(step === 'team_a' ? teamAName : teamBName) || <span className="opacity-20">Enter Team Name...</span>}
              </div>
            </motion.div>
          )}

          {(step === 'players_a' || step === 'players_b') && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <label className="block text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest">
                {step === 'players_a' ? `Players for ${teamAName}` : `Players for ${teamBName}`}
              </label>
              
              <div className="flex gap-2">
                <div 
                  onClick={() => {
                    setKeyboardTarget('player');
                    setShowKeyboard(true);
                  }}
                  className="flex-1 bg-white/5 border-b border-neon-cyan/30 py-2 font-bold text-lg cursor-pointer min-h-[44px]"
                >
                  {currentPlayerName || <span className="opacity-20 text-sm">Player Name...</span>}
                </div>
                <button 
                  onClick={addPlayer}
                  className="px-4 bg-neon-cyan text-brutal-black rounded-lg font-black"
                >
                  ADD
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                {(step === 'players_a' ? teamAPlayers : teamBPlayers).map((p, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-2 rounded-lg text-sm flex justify-between items-center">
                    <span className="truncate">{p}</span>
                    <button 
                      onClick={() => {
                        if (step === 'players_a') setTeamAPlayers(prev => prev.filter((_, idx) => idx !== i));
                        else setTeamBPlayers(prev => prev.filter((_, idx) => idx !== i));
                      }}
                      className="text-red-500 ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] opacity-40 uppercase font-mono">Total: {(step === 'players_a' ? teamAPlayers : teamBPlayers).length} Players</p>
            </motion.div>
          )}

          {step === 'wickets' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <label className="block text-[10px] uppercase font-mono mb-4 text-neon-cyan/60 tracking-widest">Wickets</label>
              <input 
                type="number" 
                value={wickets} 
                onChange={(e) => setWickets(e.target.value)} 
                className="w-full bg-white/5 border-b border-neon-cyan/30 py-4 font-bold text-2xl"
              />
            </motion.div>
          )}

          {step === 'overs' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <label className="block text-[10px] uppercase font-mono mb-4 text-neon-cyan/60 tracking-widest">Match Duration (Overs)</label>
              {matchType === 'customize' ? (
                <input 
                  type="number"
                  value={overs}
                  onChange={(e) => setOvers(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xl"
                  placeholder="Enter overs"
                />
              ) : (
                <div className="text-2xl font-bold text-neon-cyan">
                  {matchType === 'test' ? '90' : matchType === 'odi' ? '50' : '20'} Overs
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="mt-10 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 border border-white/10 rounded-2xl uppercase text-[10px] font-black tracking-[0.2em] hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          {step === 'overs' ? (
            <button 
              onClick={handleSubmit}
              disabled={!teamAName || !teamBName || teamAPlayers.length === 0 || teamBPlayers.length === 0}
              className="flex-1 py-4 bg-neon-cyan text-brutal-black rounded-2xl uppercase text-[10px] font-black tracking-[0.2em] hover:brightness-110 disabled:opacity-20 transition-all shadow-[0_0_30px_rgba(0,255,255,0.3)]"
            >
              Start Match
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={
                (step === 'team_a' && !teamAName) || 
                (step === 'team_b' && !teamBName) ||
                (step === 'players_a' && teamAPlayers.length === 0) ||
                (step === 'players_b' && teamBPlayers.length === 0)
              }
              className="flex-1 py-4 bg-neon-cyan text-brutal-black rounded-2xl uppercase text-[10px] font-black tracking-[0.2em] hover:brightness-110 disabled:opacity-20 transition-all"
            >
              Next
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showKeyboard && (
          <VirtualKeyboard 
            onKeyPress={(k) => {
              if (keyboardTarget === 'teamA') setTeamAName(prev => prev + k);
              else if (keyboardTarget === 'teamB') setTeamBName(prev => prev + k);
              else setCurrentPlayerName(prev => prev + k);
            }}
            onBackspace={() => {
              if (keyboardTarget === 'teamA') setTeamAName(prev => prev.slice(0, -1));
              else if (keyboardTarget === 'teamB') setTeamBName(prev => prev.slice(0, -1));
              else setCurrentPlayerName(prev => prev.slice(0, -1));
            }}
            onClear={() => {
              if (keyboardTarget === 'teamA') setTeamAName('');
              else if (keyboardTarget === 'teamB') setTeamBName('');
              else setCurrentPlayerName('');
            }}
            onClose={() => setShowKeyboard(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MatchDashboard({ match, onBack }: { match: Match, onBack: () => void }) {
  console.log('MatchDashboard match:', match);
  const balls = match.balls || [];
  const [showBatsmanSelect, setShowBatsmanSelect] = useState(false);
  const [showNonStrikerSelect, setShowNonStrikerSelect] = useState(false);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [currentBatsmanId, setCurrentBatsmanId] = useState<number | null>(null);
  const [currentBowlerId, setCurrentBowlerId] = useState<number | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<number | null>(null);
  const [showVictory, setShowVictory] = useState(match.status === 'finished');

  const { battingTeamName, bowlingTeamName, battingPlayers, bowlingPlayers } = useMemo(() => {
    let battingTeamName, bowlingTeamName, battingPlayers, bowlingPlayers;
    
    const isTeamABattingFirst = (match.toss_winner_id === match.team_a_id && match.toss_decision === 'bat') ||
                               (match.toss_winner_id === match.team_b_id && match.toss_decision === 'bowl');
    
    const teamABatsFirst = match.current_innings === 1 ? isTeamABattingFirst : !isTeamABattingFirst;

    if (teamABatsFirst) {
      battingTeamName = match.team_a_name;
      bowlingTeamName = match.team_b_name;
      battingPlayers = match.players?.team_a;
      bowlingPlayers = match.players?.team_b;
    } else {
      battingTeamName = match.team_b_name;
      bowlingTeamName = match.team_a_name;
      battingPlayers = match.players?.team_b;
      bowlingPlayers = match.players?.team_a;
    }

    return { battingTeamName, bowlingTeamName, battingPlayers, bowlingPlayers };
  }, [match]);

  // Derived stats
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
    
    // Calculate RRR for 2nd innings
    let requiredRunRate = '0.00';
    let target = 0;
    if (match.current_innings === 2) {
      const firstInningsRuns = balls.filter(b => b.innings_no === 1).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
      target = firstInningsRuns + 1;
      const remainingRuns = Math.max(0, target - totalRuns);
      const remainingOvers = match.total_overs - (totalBalls / 6);
      requiredRunRate = remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : '0.00';
    }

    return { totalRuns, totalWickets, overs, remainingBalls, runRate, requiredRunRate, extras, totalBalls, target, currentInningsBalls };
  }, [balls, match]);

  const isInningsOver = match.current_innings === 1 && (stats.totalWickets >= match.wickets || stats.totalBalls >= match.total_overs * 6);
  const isMatchOver = match.current_innings === 2 && (stats.totalRuns >= stats.target || stats.totalWickets >= match.wickets || stats.totalBalls >= match.total_overs * 6);

  // Check if we need to select batsman or bowler
  useEffect(() => {
    if (!match.players || !match.toss_winner_id) return;
    
    // Bowler selection at start of over
    if (stats.remainingBalls === 0 && stats.totalBalls > 0 && stats.totalBalls % 6 === 0 && !showBowlerSelect && !isInningsOver) {
      setShowBowlerSelect(true);
    }
    
    // Automatic victory trigger
    if (isMatchOver && !showVictory) {
      declareResult();
      setShowVictory(true);
    }
  }, [stats.remainingBalls, stats.totalBalls, showBowlerSelect, isInningsOver, isMatchOver, showVictory]);

  const handleSetupComplete = (batsman1: number, batsman2: number, bowler: number) => {
    setCurrentBatsmanId(batsman1);
    setNonStrikerId(batsman2);
    setCurrentBowlerId(bowler);
    setShowSetupModal(false);
  };

  const handleTossComplete = async (winnerId: number, decision: 'bat' | 'bowl') => {
    await fetch(`/api/matches/${match.id}/toss`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toss_winner_id: winnerId, toss_decision: decision }),
    });
  };

  const declareResult = async () => {
    let winnerId = null;
    const teamABattingFirst = match.toss_decision === 'bat' ? match.toss_winner_id === match.team_a_id : match.toss_winner_id === match.team_b_id;
    
    const firstInningsRuns = balls.filter(b => b.innings_no === 1).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
    const secondInningsRuns = balls.filter(b => b.innings_no === 2).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);

    if (secondInningsRuns > firstInningsRuns) {
      winnerId = teamABattingFirst ? match.team_b_id : match.team_a_id;
    } else if (firstInningsRuns > secondInningsRuns) {
      winnerId = teamABattingFirst ? match.team_a_id : match.team_b_id;
    } else {
      winnerId = null; // Tie
    }

    await fetch(`/api/matches/${match.id}/finish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_id: winnerId }),
    });
  };

  const switchInnings = async () => {
    await fetch(`/api/matches/${match.id}/innings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_innings: 2 }),
    });
    setCurrentBatsmanId(null);
    setNonStrikerId(null);
    setCurrentBowlerId(null);
    setShowSetupModal(true);
  };

  const addBall = async (ballData: Partial<Ball>) => {
    console.log('addBall called with:', ballData, 'currentBatsmanId:', currentBatsmanId, 'currentBowlerId:', currentBowlerId);
    if (!currentBatsmanId) {
      setShowBatsmanSelect(true);
      return;
    }
    if (!currentBowlerId) {
      setShowBowlerSelect(true);
      return;
    }

    const nextBallNo = (stats.totalBalls % 6) + 1;
    const nextOverNo = Math.floor(stats.totalBalls / 6);

    await fetch(`/api/matches/${match.id}/balls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        innings_no: match.current_innings,
        over_no: nextOverNo,
        ball_no: nextBallNo,
        runs: 0,
        extra_runs: 0,
        extra_type: null,
        wicket_type: null,
        batsman_id: currentBatsmanId,
        bowler_id: currentBowlerId,
        ...ballData
      }),
    });
    
    // Handle strike rotation
    const runs = ballData.runs || 0;
    const isOddRuns = runs % 2 !== 0;
    const isLegalDelivery = ballData.extra_type !== 'wide' && ballData.extra_type !== 'noball';
    const isEndOfOver = isLegalDelivery && nextBallNo === 6;

    let nextStriker = currentBatsmanId;
    let nextNonStriker = nonStrikerId;

    if (isOddRuns !== isEndOfOver) {
      nextStriker = nonStrikerId;
      nextNonStriker = currentBatsmanId;
    }

    if (ballData.wicket_type) {
      if (nextStriker === currentBatsmanId) {
        nextStriker = null;
        setShowBatsmanSelect(true);
      } else {
        nextNonStriker = null;
        setShowNonStrikerSelect(true);
      }
    }

    setCurrentBatsmanId(nextStriker);
    setNonStrikerId(nextNonStriker);
  };

  const undoLast = async () => {
    await fetch(`/api/matches/${match.id}/balls/last`, { method: 'DELETE' });
  };

  if (!match.toss_winner_id) {
    return <TossModal match={match} onComplete={handleTossComplete} />;
  }

  if (showVictory || match.status === 'finished') {
    const winnerName = match.winner_id === match.team_a_id ? match.team_a_name : (match.winner_id === match.team_b_id ? match.team_b_name : 'Tie');
    return <VictoryCelebration winnerName={winnerName || 'Unknown'} onBack={onBack} />;
  }

  return (
    <div className="space-y-6">
      {showSetupModal && !isInningsOver && !isMatchOver && (
        <MatchStartSetupModal 
          battingPlayers={battingPlayers || []}
          bowlingPlayers={bowlingPlayers || []}
          onComplete={handleSetupComplete}
        />
      )}

      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity text-xs uppercase font-mono text-neon-cyan"
        >
          <Undo2 size={14} /> Back to Dashboard
        </button>
        {isMatchOver ? (
          <button 
            onClick={declareResult}
            className="text-[10px] uppercase font-black tracking-widest text-neon-cyan border border-neon-cyan/30 px-4 py-1 rounded-full hover:bg-neon-cyan hover:text-brutal-black transition-all"
          >
            Declare Result
          </button>
        ) : isInningsOver ? (
          <button 
            onClick={switchInnings}
            className="text-[10px] uppercase font-black tracking-widest text-neon-cyan border border-neon-cyan/30 px-4 py-1 rounded-full hover:bg-neon-cyan hover:text-brutal-black transition-all"
          >
            Start 2nd Innings
          </button>
        ) : (
          <button 
            onClick={declareResult}
            className="text-[10px] uppercase font-black tracking-widest text-red-500 border border-red-500/30 px-4 py-1 rounded-full hover:bg-red-500 hover:text-white transition-all"
          >
            Finish Match Early
          </button>
        )}
      </div>

      <div className="bg-neon-cyan/5 border border-neon-cyan/20 p-3 rounded-xl flex items-center gap-3">
        <div className="w-6 h-6 bg-neon-cyan/20 rounded-full flex items-center justify-center">
          <Circle size={10} className="text-neon-cyan" />
        </div>
        <p className="text-[10px] uppercase font-mono tracking-widest text-neon-cyan/80">
          Toss: <span className="text-neon-cyan font-bold">{match.toss_winner_id === match.team_a_id ? match.team_a_name : match.team_b_name}</span> won and chose to <span className="text-neon-cyan font-bold">{match.toss_decision}</span>. 
          <span className="text-white/60"> 1st Team: {match.team_a_name} | 2nd Team: {match.team_b_name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Display */}
        <div className="md:col-span-2 hardware-widget p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy size={120} />
          </div>
          
          <div className="flex justify-between items-start z-10">
            <div>
              <h3 className="font-serif italic text-xl text-neon-cyan/80">{battingTeamName} <span className="text-xs font-sans not-italic text-white/40 uppercase tracking-widest ml-2">Innings {match.current_innings}</span></h3>
              <div className="flex items-baseline gap-4 mt-2">
                <span className="text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{stats.totalRuns}</span>
                <span className="text-5xl font-light text-white/40">/ {stats.totalWickets}</span>
              </div>
              <div className="mt-4 flex gap-4 text-xs font-mono uppercase tracking-widest opacity-60">
                <button onClick={() => setShowBatsmanSelect(true)} className="hover:text-neon-cyan transition-colors">
                  Striker: {battingPlayers?.find(p => p.id === currentBatsmanId)?.name || 'Select'}
                </button>
                <button onClick={() => setShowNonStrikerSelect(true)} className="hover:text-neon-cyan transition-colors">
                  Non-Striker: {battingPlayers?.find(p => p.id === nonStrikerId)?.name || 'Select'}
                </button>
                <button onClick={() => setShowBowlerSelect(true)} className="hover:text-neon-cyan transition-colors">
                  Bowling: {bowlingPlayers?.find(p => p.id === currentBowlerId)?.name || 'Select'}
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest mb-1">Overs</div>
              <div className="text-4xl font-mono font-bold">{stats.overs}.{stats.remainingBalls}</div>
              <div className="text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest mt-4 mb-1">Run Rate</div>
              <div className="text-2xl font-mono text-neon-cyan">{stats.runRate}</div>
              {match.current_innings === 2 && (
                <>
                  <div className="text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest mt-4 mb-1">Target</div>
                  <div className="text-2xl font-mono text-neon-cyan">{stats.target}</div>
                  <div className="text-[10px] uppercase font-mono text-neon-cyan/60 tracking-widest mt-4 mb-1">Req Run Rate</div>
                  <div className="text-2xl font-mono text-neon-cyan">{stats.requiredRunRate}</div>
                </>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex gap-4 overflow-x-auto pb-2 z-10">
            {stats.currentInningsBalls.slice(-6).map((b, i) => (
              <div key={i} className={`w-12 h-12 rounded-full flex items-center justify-center font-mono text-lg font-bold border-2 shrink-0 ${
                b.wicket_type ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 
                b.runs === 4 ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' :
                b.runs === 6 ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' :
                'border-white/20 text-white/60 bg-white/5'
              }`}>
                {b.wicket_type ? 'W' : b.extra_type === 'wide' ? 'wd' : b.extra_type === 'noball' ? 'nb' : b.runs}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 6 - balls.slice(-6).length) }).map((_, i) => (
              <div key={`empty-${i}`} className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center opacity-20">
                <Circle size={12} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-brutal-black border border-neon-cyan/30 rounded-xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <h4 className="col-header mb-4 text-neon-cyan">Match Info</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-white/5 pb-1">
                <span className="text-xs font-mono opacity-50 uppercase">Target</span>
                <span className="font-bold">{match.current_innings === 2 ? stats.target : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1">
                <span className="text-xs font-mono opacity-50 uppercase">Extras</span>
                <span className="font-bold text-neon-cyan">{stats.extras}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1">
                <span className="text-xs font-mono opacity-50 uppercase">Max Overs</span>
                <span className="font-bold">{match.total_overs}</span>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="flex items-center gap-2 text-xs font-mono opacity-50 uppercase mb-2 text-neon-cyan">
              <TrendingUp size={12} /> Projection
            </div>
            <div className="text-4xl font-black text-white">
              {Math.round(parseFloat(stats.runRate) * match.total_overs)}
            </div>
            <div className="text-[10px] opacity-40 font-mono">Based on current RR</div>
          </div>
        </div>
      </div>

      {/* Scoring Controls */}
      {!isInningsOver && !isMatchOver && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-3 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 6].map(r => (
              <button 
                key={r}
                onClick={() => addBall({ runs: r })}
                className="h-20 bg-white/5 border border-white/10 rounded-xl font-black text-3xl hover:bg-neon-cyan hover:text-brutal-black hover:border-neon-cyan transition-all shadow-lg active:scale-95"
              >
                {r}
              </button>
            ))}
            <button 
              onClick={() => addBall({ runs: 0, extra_runs: 1, extra_type: 'wide' })}
              className="h-20 bg-orange-500/10 border border-orange-500/50 text-orange-500 rounded-xl font-bold text-sm uppercase tracking-tighter hover:bg-orange-500 hover:text-white transition-all"
            >
              Wide
            </button>
            <button 
              onClick={() => addBall({ runs: 0, extra_runs: 1, extra_type: 'noball' })}
              className="h-20 bg-blue-500/10 border border-blue-500/50 text-blue-500 rounded-xl font-bold text-sm uppercase tracking-tighter hover:bg-blue-500 hover:text-white transition-all"
            >
              No Ball
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => addBall({ runs: 0, wicket_type: 'Bowled' })}
              className="flex-1 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-lg hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all active:scale-95"
            >
              WICKET
            </button>
            <button 
              onClick={undoLast}
              className="h-14 border border-white/20 rounded-xl flex items-center justify-center gap-2 text-xs uppercase font-bold hover:bg-white/10 transition-all"
            >
              <Undo2 size={16} /> Undo Last
            </button>
          </div>
          <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-2">
            <button 
              onClick={() => setShowScorecard(true)}
              className="w-full h-20 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl font-black text-xl hover:bg-neon-cyan hover:text-brutal-black transition-all"
            >
              Scorecard
            </button>
            <button 
              onClick={() => setShowStatsModal(true)}
              className="w-full h-20 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl font-black text-xl hover:bg-neon-cyan hover:text-brutal-black transition-all"
            >
              View Stats
            </button>
          </div>
        </div>
      )}

      {showScorecard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 p-4 overflow-y-auto">
          <button onClick={() => setShowScorecard(false)} className="text-neon-cyan mb-4">Close</button>
          <Scorecard 
            match={match} 
            balls={balls} 
            currentBatsmanId={currentBatsmanId} 
            nonStrikerId={nonStrikerId} 
            currentBowlerId={currentBowlerId} 
          />
        </div>
      )}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 p-4 overflow-y-auto">
          <button onClick={() => setShowStatsModal(false)} className="text-neon-cyan mb-4">Close</button>
          <PlayerStatsTable players={battingPlayers || []} stats={calculatePlayerStats(balls, battingPlayers || [])} title={`${battingTeamName} Stats`} />
          <PlayerStatsTable players={bowlingPlayers || []} stats={calculatePlayerStats(balls, bowlingPlayers || [])} title={`${bowlingTeamName} Stats`} />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h4 className="col-header mb-4 text-neon-cyan">Batting ({battingTeamName})</h4>
          <div className="space-y-2">
            {battingPlayers?.map(p => {
              const playerBalls = balls.filter(b => b.batsman_id === p.id);
              const runs = playerBalls.reduce((sum, b) => sum + b.runs, 0);
              const ballsFaced = playerBalls.filter(b => b.extra_type !== 'wide').length;
              const fours = playerBalls.filter(b => b.runs === 4).length;
              const sixes = playerBalls.filter(b => b.runs === 6).length;
              const strikeRate = ballsFaced > 0 ? ((runs / ballsFaced) * 100).toFixed(1) : '0.0';
              const isOut = balls.some(b => b.batsman_id === p.id && b.wicket_type);

              if (ballsFaced === 0 && !isOut && p.id !== currentBatsmanId && p.id !== nonStrikerId) return null;

              return (
                <div key={p.id} className={`flex justify-between items-center p-2 rounded-lg ${p.id === currentBatsmanId ? 'bg-neon-cyan/10 border border-neon-cyan/30' : 'border border-transparent'}`}>
                  <div className="flex flex-col">
                    <span className={`font-bold ${p.id === currentBatsmanId ? 'text-neon-cyan' : 'text-white'}`}>
                      {p.name} {p.id === currentBatsmanId && '*'}
                    </span>
                    <span className="text-[10px] opacity-40 font-mono">
                      {isOut ? 'out' : 'not out'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-right font-mono text-xs">
                    <div className="w-8">
                      <div className="opacity-40 text-[8px] uppercase">R</div>
                      <div className="font-bold">{runs}</div>
                    </div>
                    <div className="w-8">
                      <div className="opacity-40 text-[8px] uppercase">B</div>
                      <div>{ballsFaced}</div>
                    </div>
                    <div className="w-8 hidden sm:block">
                      <div className="opacity-40 text-[8px] uppercase">4s</div>
                      <div>{fours}</div>
                    </div>
                    <div className="w-8 hidden sm:block">
                      <div className="opacity-40 text-[8px] uppercase">6s</div>
                      <div>{sixes}</div>
                    </div>
                    <div className="w-10">
                      <div className="opacity-40 text-[8px] uppercase">SR</div>
                      <div>{strikeRate}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h4 className="col-header mb-4 text-neon-cyan">Bowling ({bowlingTeamName})</h4>
          <div className="space-y-2">
            {bowlingPlayers?.map(p => {
              const playerBalls = balls.filter(b => b.bowler_id === p.id);
              if (playerBalls.length === 0 && p.id !== currentBowlerId) return null;

              const overs = Math.floor(playerBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length / 6);
              const ballsInOver = playerBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length % 6;
              const runsConceded = playerBalls.reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
              const wickets = playerBalls.filter(b => b.wicket_type).length;
              const economy = (playerBalls.length > 0) ? (runsConceded / (playerBalls.length/6)).toFixed(1) : '0.0';

              return (
                <div key={p.id} className={`flex justify-between items-center p-2 rounded-lg ${p.id === currentBowlerId ? 'bg-neon-cyan/10 border border-neon-cyan/30' : 'border border-transparent'}`}>
                  <div className="flex flex-col">
                    <span className={`font-bold ${p.id === currentBowlerId ? 'text-neon-cyan' : 'text-white'}`}>
                      {p.name} {p.id === currentBowlerId && '*'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-right font-mono text-xs">
                    <div className="w-8">
                      <div className="opacity-40 text-[8px] uppercase">O</div>
                      <div className="font-bold">{overs}.{ballsInOver}</div>
                    </div>
                    <div className="w-8">
                      <div className="opacity-40 text-[8px] uppercase">M</div>
                      <div>0</div>
                    </div>
                    <div className="w-8">
                      <div className="opacity-40 text-[8px] uppercase">R</div>
                      <div>{runsConceded}</div>
                    </div>
                    <div className="w-8">
                      <div className="opacity-40 text-[8px] uppercase">W</div>
                      <div className="font-bold text-neon-cyan">{wickets}</div>
                    </div>
                    <div className="w-10">
                      <div className="opacity-40 text-[8px] uppercase">ECO</div>
                      <div>{economy}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ball History */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
          <h4 className="col-header text-neon-cyan">Ball-by-Ball Timeline</h4>
          <span className="text-[10px] font-mono opacity-50 uppercase">Recent first</span>
        </div>
        <div className="space-y-2">
          {balls.slice().reverse().map((b, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={b.id} 
              className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-xl text-sm hover:border-neon-cyan/30 transition-colors"
            >
              <span className="font-mono text-[10px] opacity-40 w-12">{b.over_no}.{b.ball_no}</span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                b.wicket_type ? 'bg-red-600 text-white' : 'bg-brutal-black border border-white/20 text-white'
              }`}>
                {b.wicket_type ? 'W' : b.runs + b.extra_runs}
              </div>
              <div className="flex-1 flex flex-col">
                <span className="font-bold text-white">
                  {b.wicket_type ? (
                    <span className="text-red-500 uppercase tracking-wider">Wicket! ({b.wicket_type})</span>
                  ) : b.extra_type ? (
                    <span className="opacity-80 italic text-neon-cyan">{b.extra_type.toUpperCase()} +{b.extra_runs}</span>
                  ) : (
                    <span>{b.runs} runs</span>
                  )}
                </span>
                <span className="text-[10px] opacity-40 font-mono">
                  {b.batsman_name || 'Unknown'} vs {b.bowler_name || 'Unknown'}
                </span>
              </div>
              <span className="text-[10px] font-mono opacity-30">{new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {showBatsmanSelect && (
          <PlayerSelectModal 
            players={battingPlayers || []}
            onSelect={(id) => {
              setCurrentBatsmanId(id);
              setShowBatsmanSelect(false);
            }}
            title="Select Striker"
          />
        )}
        {showNonStrikerSelect && (
          <PlayerSelectModal 
            players={battingPlayers || []}
            onSelect={(id) => {
              setNonStrikerId(id);
              setShowNonStrikerSelect(false);
            }}
            title="Select Non-Striker"
          />
        )}
        {showBowlerSelect && (
          <PlayerSelectModal 
            players={bowlingPlayers || []}
            onSelect={(id) => {
              setCurrentBowlerId(id);
              setShowBowlerSelect(false);
            }}
            title="Select Bowler"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerSelectModal({ players, onSelect, title }: { players: Player[], onSelect: (id: number) => void, title: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-brutal-black border border-neon-cyan p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,255,255,0.2)]"
      >
        <h2 className="font-serif text-3xl mb-6 italic text-neon-cyan">{title}</h2>
        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
          {players.map(p => (
            <button 
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="p-4 text-left border border-white/10 rounded-xl hover:bg-neon-cyan hover:text-brutal-black transition-all group"
            >
              <span className="font-bold text-lg">{p.name}</span>
              {p.is_captain && <span className="ml-2 text-[10px] uppercase bg-white/10 px-2 py-1 rounded group-hover:bg-brutal-black/20">C</span>}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function calculatePlayerStats(balls: Ball[], players: Player[]) {
  const stats: Record<number, { runs: number, balls: number, fours: number, sixes: number, wickets: number, overs: number, economy: number }> = {};
  
  players.forEach(p => {
    stats[p.id] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, overs: 0, economy: 0 };
  });

  balls.forEach(b => {
    if (b.batsman_id && stats[b.batsman_id]) {
      stats[b.batsman_id].runs += b.runs;
      stats[b.batsman_id].balls += 1;
      if (b.runs === 4) stats[b.batsman_id].fours += 1;
      if (b.runs === 6) stats[b.batsman_id].sixes += 1;
    }
    if (b.bowler_id && stats[b.bowler_id]) {
      stats[b.bowler_id].runs += (b.runs + b.extra_runs);
      stats[b.bowler_id].balls += 1;
      if (b.wicket_type) stats[b.bowler_id].wickets += 1;
    }
  });

  Object.keys(stats).forEach(id => {
    const s = stats[Number(id)];
    s.overs = Math.floor(s.balls / 6) + (s.balls % 6) / 10;
    s.economy = s.balls > 0 ? (s.runs / (s.balls / 6)).toFixed(2) as unknown as number : 0;
  });

  return stats;
}

function PlayerStatsTable({ players, stats, title }: { players: Player[], stats: any, title: string }) {
  return (
    <div className="bg-brutal-black border border-neon-cyan/20 rounded-xl p-6 mt-6">
      <h3 className="font-serif text-2xl mb-4 italic text-neon-cyan">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10 text-neon-cyan/60">
              <th className="p-2">Player</th>
              <th className="p-2">R</th>
              <th className="p-2">B</th>
              <th className="p-2">4s</th>
              <th className="p-2">6s</th>
              <th className="p-2">SR</th>
              <th className="p-2">W</th>
              <th className="p-2">O</th>
              <th className="p-2">Econ</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const s = stats[p.id];
              const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : '0.0';
              return (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-2 font-bold">{p.name}</td>
                  <td className="p-2">{s.runs}</td>
                  <td className="p-2">{s.balls}</td>
                  <td className="p-2">{s.fours}</td>
                  <td className="p-2">{s.sixes}</td>
                  <td className="p-2">{sr}</td>
                  <td className="p-2">{s.wickets}</td>
                  <td className="p-2">{s.overs}</td>
                  <td className="p-2">{s.economy}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchStartSetupModal({ battingPlayers, bowlingPlayers, onComplete }: { battingPlayers: Player[], bowlingPlayers: Player[], onComplete: (batsman1: number, batsman2: number, bowler: number) => void }) {
  console.log('MatchStartSetupModal players:', { battingPlayers, bowlingPlayers });
  const [batsman1, setBatsman1] = useState<number | null>(null);
  const [batsman2, setBatsman2] = useState<number | null>(null);
  const [bowler, setBowler] = useState<number | null>(null);

  const isReady = batsman1 !== null && batsman2 !== null && bowler !== null;

  return (
    <motion.div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-brutal-black border border-neon-cyan p-8 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,255,255,0.2)] pointer-events-auto">
        <h2 className="font-serif text-3xl mb-6 italic text-neon-cyan">Match Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <h3 className="text-white font-bold mb-3">Batsman 1</h3>
            <div className="overflow-y-auto">
              {battingPlayers.map(p => (
                <button key={p.id} onClick={() => setBatsman1(p.id)} className={`w-full p-3 mb-2 text-left border rounded-lg ${batsman1 === p.id ? 'bg-neon-cyan text-brutal-black' : 'border-white/10'}`}>{p.name}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3">Batsman 2</h3>
            <div className="overflow-y-auto">
              {battingPlayers.map(p => (
                <button key={p.id} onClick={() => setBatsman2(p.id)} className={`w-full p-3 mb-2 text-left border rounded-lg ${batsman2 === p.id ? 'bg-neon-cyan text-brutal-black' : 'border-white/10'}`}>{p.name}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3">Bowler</h3>
            <div className="overflow-y-auto">
              {bowlingPlayers.map(p => (
                <button key={p.id} onClick={() => setBowler(p.id)} className={`w-full p-3 mb-2 text-left border rounded-lg ${bowler === p.id ? 'bg-neon-cyan text-brutal-black' : 'border-white/10'}`}>{p.name}</button>
              ))}
            </div>
          </div>
        </div>
        <button 
          disabled={!isReady}
          onClick={() => onComplete(batsman1!, batsman2!, bowler!)}
          className="w-full mt-8 py-4 bg-neon-cyan text-brutal-black font-black rounded-xl disabled:opacity-50"
        >
          Start Match
        </button>
      </div>
    </motion.div>
  );
}

function TossModal({ match, onComplete }: { match: Match, onComplete: (winnerId: number, decision: 'bat' | 'bowl') => void }) {
  const [callingTeamId, setCallingTeamId] = useState<number>(match.team_a_id);
  const [choice, setChoice] = useState<'heads' | 'tails' | null>(null);
  const [step, setStep] = useState<'select_team' | 'select_choice' | 'spin' | 'result'>('select_team');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);

  const spinCoin = (selectedChoice: 'heads' | 'tails') => {
    setChoice(selectedChoice);
    setSpinning(true);
    setStep('spin');
    setTimeout(() => {
      const res = Math.random() > 0.5 ? 'heads' : 'tails';
      setResult(res);
      setSpinning(false);
      const won = res === selectedChoice;
      setWinnerId(won ? callingTeamId : (callingTeamId === match.team_a_id ? match.team_b_id : match.team_a_id));
      setStep('result');
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[60] p-4"
    >
      <div className="max-w-md w-full text-center">
        {step === 'select_team' && (
          <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="space-y-8">
            <h2 className="font-serif text-5xl italic text-neon-cyan">The Toss</h2>
            <p className="text-white/60 uppercase tracking-[0.3em] text-[10px]">Select team to call</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setCallingTeamId(match.team_a_id); setStep('select_choice'); }}
                className={`py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest ${callingTeamId === match.team_a_id ? 'border-neon-cyan bg-neon-cyan text-brutal-black' : 'border-white/10 hover:border-white/30'}`}
              >
                {match.team_a_name}
              </button>
              <button 
                onClick={() => { setCallingTeamId(match.team_b_id); setStep('select_choice'); }}
                className={`py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest ${callingTeamId === match.team_b_id ? 'border-neon-cyan bg-neon-cyan text-brutal-black' : 'border-white/10 hover:border-white/30'}`}
              >
                {match.team_b_name}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'select_choice' && (
          <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="space-y-8">
            <h2 className="font-serif text-5xl italic text-neon-cyan">
              {callingTeamId === match.team_a_id ? match.team_a_name : match.team_b_name} calling
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => spinCoin('heads')}
                className={`py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest ${choice === 'heads' ? 'border-neon-cyan bg-neon-cyan text-brutal-black' : 'border-white/10 hover:border-white/30'}`}
              >
                Heads
              </button>
              <button 
                onClick={() => spinCoin('tails')}
                className={`py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest ${choice === 'tails' ? 'border-neon-cyan bg-neon-cyan text-brutal-black' : 'border-white/10 hover:border-white/30'}`}
              >
                Tails
              </button>
            </div>
            <button onClick={() => setStep('select_team')} className="text-white/40 hover:text-white">Back</button>
          </motion.div>
        )}

        {step === 'spin' && (
          <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="space-y-8">
            <h2 className="font-serif text-5xl italic text-neon-cyan">Spinning...</h2>
            <div className="relative h-48 flex items-center justify-center">
              <motion.div
                animate={{ rotateY: 3600, scale: [1, 1.2, 1] }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="w-32 h-32 rounded-full border-4 border-neon-cyan bg-brutal-black flex items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.4)]"
              >
                <span className="text-neon-cyan font-black text-4xl uppercase">?</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-8">
            <div className="w-24 h-24 bg-neon-cyan rounded-full mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.5)]">
              <Trophy className="text-brutal-black" size={40} />
            </div>
            <h2 className="font-serif text-4xl italic text-white">
              Result: {result?.toUpperCase()}! <br/>
              {winnerId === match.team_a_id ? match.team_a_name : match.team_b_name} won the toss!
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onComplete(winnerId!, 'bat')}
                className="py-4 border border-neon-cyan text-neon-cyan rounded-2xl font-black uppercase tracking-widest hover:bg-neon-cyan hover:text-brutal-black transition-all"
              >
                Bat First
              </button>
              <button 
                onClick={() => onComplete(winnerId!, 'bowl')}
                className="py-4 border border-neon-cyan text-neon-cyan rounded-2xl font-black uppercase tracking-widest hover:bg-neon-cyan hover:text-brutal-black transition-all"
              >
                Bowl First
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}


function Scorecard({ match, balls, currentBatsmanId, nonStrikerId, currentBowlerId }: { match: Match, balls: Ball[], currentBatsmanId: number | null, nonStrikerId: number | null, currentBowlerId: number | null }) {
  const [innings, setInnings] = useState(match.current_innings);
  const inningsBalls = balls.filter(b => b.innings_no === innings);
  
  const battingTeamName = innings === 1 ? match.team_a_name : match.team_b_name;
  const bowlingTeamName = innings === 1 ? match.team_b_name : match.team_a_name;
  const battingPlayers = innings === 1 ? match.players?.team_a : match.players?.team_b;
  const bowlingPlayers = innings === 1 ? match.players?.team_b : match.players?.team_a;

  const totalRuns = inningsBalls.reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
  const totalWickets = inningsBalls.filter(b => b.wicket_type).length;
  const totalBalls = inningsBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
  const overs = Math.floor(totalBalls / 6);
  const ballsInOver = totalBalls % 6;

  const extras = inningsBalls.reduce((sum, b) => sum + b.extra_runs, 0);
  const extrasBreakdown = inningsBalls.reduce((acc, b) => {
    if (b.extra_type) acc[b.extra_type] = (acc[b.extra_type] || 0) + b.extra_runs;
    return acc;
  }, {} as Record<string, number>);

  const fallOfWickets = inningsBalls.filter(b => b.wicket_type).map((b, i) => ({
    wicket: i + 1,
    runs: inningsBalls.slice(0, inningsBalls.indexOf(b) + 1).reduce((sum, ball) => sum + ball.runs + ball.extra_runs, 0),
    over: Math.floor(inningsBalls.slice(0, inningsBalls.indexOf(b) + 1).filter(ball => ball.extra_type !== 'wide' && ball.extra_type !== 'noball').length / 6),
    ball: inningsBalls.slice(0, inningsBalls.indexOf(b) + 1).filter(ball => ball.extra_type !== 'wide' && ball.extra_type !== 'noball').length % 6
  }));

  return (
    <div className="space-y-6 text-white">
      <div className="flex gap-4">
        <button onClick={() => setInnings(1)} className={`px-4 py-2 rounded-full ${innings === 1 ? 'bg-neon-cyan text-brutal-black' : 'bg-white/5'}`}>Innings 1</button>
        <button onClick={() => setInnings(2)} className={`px-4 py-2 rounded-full ${innings === 2 ? 'bg-neon-cyan text-brutal-black' : 'bg-white/5'}`}>Innings 2</button>
      </div>
      <div className="bg-white/5 p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-neon-cyan">{battingTeamName} Innings</h2>
        <div className="text-4xl font-black">{totalRuns}/{totalWickets} ({overs}.{ballsInOver} overs)</div>
      </div>
      
      <div className="bg-white/5 p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-4">Batting</h3>
        <div className="grid grid-cols-6 text-[10px] uppercase font-mono opacity-50 mb-2">
          <div className="col-span-2">Batsman</div>
          <div>R</div><div>B</div><div>4s</div><div>6s</div><div>SR</div>
        </div>
        {battingPlayers?.map(p => {
          const playerBalls = inningsBalls.filter(b => b.batsman_id === p.id);
          const runs = playerBalls.reduce((sum, b) => sum + b.runs, 0);
          const ballsFaced = playerBalls.filter(b => b.extra_type !== 'wide').length;
          const fours = playerBalls.filter(b => b.runs === 4).length;
          const sixes = playerBalls.filter(b => b.runs === 6).length;
          const strikeRate = ballsFaced > 0 ? ((runs / ballsFaced) * 100).toFixed(1) : '0.0';
          const dismissal = playerBalls.find(b => b.wicket_type)?.wicket_type;
          
          if (ballsFaced === 0 && p.id !== currentBatsmanId && p.id !== nonStrikerId) return null;
          
          const isStriker = p.id === currentBatsmanId;
          const isOut = !!dismissal;

          return (
            <div key={p.id} className="grid grid-cols-6 py-2 border-b border-white/5 items-center">
              <div className="col-span-2 font-bold">
                {p.name} {isStriker && '*'}
                {isOut && <span className="text-red-500 text-[10px] block font-normal">{dismissal}</span>}
              </div>
              <div className={runs >= 100 ? 'text-amber-400 font-bold' : (runs >= 50 ? 'text-yellow-500 font-bold' : '')}>{runs}</div>
              <div>{ballsFaced}</div>
              <div>{fours}</div>
              <div>{sixes}</div>
              <div>{strikeRate}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white/5 p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-4">Bowling</h3>
        <div className="grid grid-cols-6 text-[10px] uppercase font-mono opacity-50 mb-2">
          <div className="col-span-2">Bowler</div>
          <div>O</div><div>M</div><div>R</div><div>W</div><div>Econ</div>
        </div>
        {bowlingPlayers?.map(p => {
          const playerBalls = inningsBalls.filter(b => b.bowler_id === p.id);
          const overs = Math.floor(playerBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length / 6);
          const ballsInOver = playerBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length % 6;
          const runsConceded = playerBalls.reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
          const wickets = playerBalls.filter(b => b.wicket_type).length;
          const maidens = 0; // Simplified
          const economy = (playerBalls.length > 0) ? (runsConceded / (playerBalls.length/6)).toFixed(1) : '0.0';
          
          if (playerBalls.length === 0) return null;
          return (
            <div key={p.id} className="grid grid-cols-6 py-2 border-b border-white/5 items-center">
              <div className="col-span-2 font-bold">{p.name} {p.id === currentBowlerId && '*'}</div>
              <div>{overs}.{ballsInOver}</div>
              <div>{maidens}</div>
              <div>{runsConceded}</div>
              <div className="text-red-500 font-bold">{wickets}</div>
              <div>{economy}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white/5 p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-4">Extras & FOW</h3>
        <div className="text-sm">Extras: {extras} ({Object.entries(extrasBreakdown).map(([k, v]) => `${k}:${v}`).join(', ')})</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {fallOfWickets.map(f => (
            <span key={f.wicket} className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm">
              {f.wicket}-{f.runs} ({f.over}.{f.ball})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            top: '100%', 
            left: `${Math.random() * 100}%`,
            scale: 0,
            opacity: 1
          }}
          animate={{ 
            top: `${Math.random() * 50}%`,
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut"
          }}
          className={`absolute w-2 h-2 rounded-full ${
            ['bg-neon-cyan', 'bg-white', 'bg-yellow-400', 'bg-pink-500'][Math.floor(Math.random() * 4)]
          } shadow-[0_0_10px_currentColor]`}
        />
      ))}
    </div>
  );
}

function VirtualKeyboard({ onKeyPress, onBackspace, onClear, onClose }: { onKeyPress: (key: string) => void, onBackspace: () => void, onClear: () => void, onClose: () => void }) {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ' '],
  ];

  return (
    <motion.div 
      initial={{ y: 300 }}
      animate={{ y: 0 }}
      exit={{ y: 300 }}
      className="fixed bottom-0 left-0 right-0 bg-brutal-black border-t border-neon-cyan p-4 z-[100] shadow-[0_-10px_50px_rgba(0,255,255,0.2)]"
    >
      <div className="max-w-3xl mx-auto space-y-2">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] uppercase font-mono text-neon-cyan tracking-widest">Neon Keypad</span>
          <button onClick={onClose} className="text-white/40 hover:text-white"><Undo2 size={16} /></button>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map(key => (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                className={`h-12 ${key === ' ' ? 'flex-[3]' : 'flex-1'} bg-white/5 border border-white/10 rounded-lg font-bold hover:bg-neon-cyan hover:text-brutal-black transition-all active:scale-95`}
              >
                {key === ' ' ? 'SPACE' : key}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1 mt-2">
          <button
            onClick={onClear}
            className="flex-1 h-12 bg-red-500/20 border border-red-500/30 rounded-lg font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            CLEAR
          </button>
          <button
            onClick={onBackspace}
            className="flex-1 h-12 bg-white/10 border border-white/20 rounded-lg font-bold hover:bg-white/20 transition-all"
          >
            BACKSPACE
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-neon-cyan border border-neon-cyan rounded-lg font-black text-brutal-black hover:brightness-110 transition-all"
          >
            DONE
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function VictoryCelebration({ winnerName, onBack }: { winnerName: string, onBack: () => void }) {
  useEffect(() => {
    const victorySound = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    const crackersSound = new Audio('https://actions.google.com/sounds/v1/explosions/fireworks_explosion.ogg');
    
    victorySound.play().catch(e => console.error("Sound play failed", e));
    crackersSound.play().catch(e => console.error("Sound play failed", e));

    return () => {
      victorySound.pause();
      crackersSound.pause();
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-brutal-black/95 backdrop-blur-2xl flex flex-col items-center justify-center z-[70] p-4 text-center"
    >
      <Confetti />
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12 }}
        className="relative mb-12"
      >
        <div className="absolute inset-0 bg-neon-cyan blur-[100px] opacity-20 animate-pulse" />
        <Trophy size={160} className="text-neon-cyan relative z-10 drop-shadow-[0_0_30px_rgba(0,255,255,0.8)]" />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <h2 className="font-serif text-7xl font-black italic text-white tracking-tighter">VICTORY</h2>
        <p className="text-neon-cyan font-mono text-2xl uppercase tracking-[0.4em] font-bold">
          {winnerName}
        </p>
        <p className="text-white/40 text-sm uppercase tracking-widest mt-8">Champions of the Field</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        onClick={onBack}
        className="mt-16 px-12 py-4 border border-neon-cyan text-neon-cyan rounded-full font-black uppercase tracking-widest hover:bg-neon-cyan hover:text-brutal-black transition-all"
      >
        Return to Dashboard
      </motion.button>
    </motion.div>
  );
}
