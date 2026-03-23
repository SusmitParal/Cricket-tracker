import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { Team } from '../types';

export default function TournamentSetupModal({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string, teams: Team[]) => void }) {
  const [tournamentName, setTournamentName] = useState('');
  const [numTeams, setNumTeams] = useState(4);
  const [teams, setTeams] = useState<Team[]>([]);
  const [step, setStep] = useState<'name' | 'teams' | 'players'>('name');
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [currentTeamName, setCurrentTeamName] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState('');

  const handleNext = () => {
    if (step === 'name') setStep('teams');
    else if (step === 'teams') {
      // Initialize teams with empty names and players
      setTeams(Array.from({ length: numTeams }, (_, i) => ({ id: i, name: '', players: [] })));
      setStep('players');
    } else if (step === 'players') {
      // Save current team name
      const updatedTeams = teams.map((t, i) => i === currentTeamIndex ? {...t, name: currentTeamName} : t);
      setTeams(updatedTeams);
      setCurrentTeamName('');
      
      if (currentTeamIndex < numTeams - 1) {
        setCurrentTeamIndex(currentTeamIndex + 1);
      } else {
        onCreate(tournamentName, updatedTeams);
        onClose();
      }
    }
  };

  return (
    <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-brutal-black border border-neon-cyan p-8 rounded-3xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-neon-cyan">Tournament Setup</h2>
        {step === 'name' && (
          <input 
            value={tournamentName} 
            onChange={(e) => setTournamentName(e.target.value)}
            placeholder="Tournament Name"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl mb-4"
          />
        )}
        {step === 'teams' && (
          <input 
            type="number"
            value={numTeams}
            onChange={(e) => setNumTeams(parseInt(e.target.value))}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl mb-4"
          />
        )}
        {step === 'players' && (
          <div>
            <h3 className="text-xl font-bold mb-4">Team {currentTeamIndex + 1}</h3>
            <input 
              value={currentTeamName}
              onChange={(e) => setCurrentTeamName(e.target.value)}
              placeholder="Team Name"
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl mb-4"
            />
            <div className="flex gap-2 mb-4">
              <input 
                value={currentPlayer}
                onChange={(e) => setCurrentPlayer(e.target.value)}
                placeholder="Player Name"
                className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl"
              />
              <button 
                onClick={() => {
                  setTeams(prev => prev.map((t, i) => i === currentTeamIndex ? {...t, players: [...t.players, currentPlayer]} : t));
                  setCurrentPlayer('');
                }}
                className="bg-neon-cyan text-brutal-black px-4 rounded-xl"
              >Add</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {teams[currentTeamIndex].players.map((p, i) => <div key={i} className="bg-white/5 p-2 rounded-lg">{p}</div>)}
            </div>
          </div>
        )}
        <button onClick={handleNext} className="w-full py-4 bg-neon-cyan text-brutal-black rounded-2xl mt-6">
          {step === 'players' && currentTeamIndex === numTeams - 1 ? 'Create' : 'Next'}
        </button>
      </div>
    </motion.div>
  );
}
