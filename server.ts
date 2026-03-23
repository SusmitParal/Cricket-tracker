import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('cricket.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    team_a_id INTEGER NOT NULL,
    team_b_id INTEGER NOT NULL,
    total_overs INTEGER NOT NULL,
    current_innings INTEGER DEFAULT 1,
    toss_winner_id INTEGER,
    toss_decision TEXT, -- 'bat' or 'bowl'
    wickets INTEGER DEFAULT 10,
    winner_id INTEGER,
    status TEXT DEFAULT 'ongoing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
    FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (toss_winner_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS balls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    innings_no INTEGER NOT NULL,
    over_no INTEGER NOT NULL,
    ball_no INTEGER NOT NULL,
    runs INTEGER NOT NULL,
    extra_runs INTEGER DEFAULT 0,
    extra_type TEXT, -- 'wide', 'noball', 'bye', 'legbye'
    wicket_type TEXT,
    batsman_id INTEGER,
    bowler_id INTEGER,
    wicket_taker_id INTEGER, -- Fielder or bowler who took the wicket
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (batsman_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (bowler_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (wicket_taker_id) REFERENCES players(id) ON DELETE SET NULL
  );
`);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  // Tournament API
  app.get('/api/tournaments', (req, res) => {
    const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all();
    res.json(tournaments);
  });

  app.post('/api/tournaments', (req, res) => {
    const { name, teams } = req.body;
    try {
      const info = db.prepare('INSERT INTO tournaments (name) VALUES (?)').run(name);
      const tournamentId = info.lastInsertRowid;
      
      if (teams) {
        for (const team of teams) {
          const teamInfo = db.prepare('INSERT INTO teams (name, tournament_id) VALUES (?, ?)').run(team.name, tournamentId);
          const teamId = teamInfo.lastInsertRowid;
          for (const player of team.players) {
            db.prepare('INSERT INTO players (name, team_id) VALUES (?, ?)').run(player, teamId);
          }
        }
      }

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      broadcast({ type: 'TOURNAMENT_CREATED', tournament });
      res.json(tournament);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Tournament with this name already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tournaments/:id/schedule', (req, res) => {
    const tournamentId = req.params.id;
    const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ?').all(tournamentId);
    
    // Simple round-robin
    const matches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({ team_a_id: teams[i].id, team_b_id: teams[j].id });
      }
    }

    for (const match of matches) {
      db.prepare('INSERT INTO matches (tournament_id, team_a_id, team_b_id, total_overs) VALUES (?, ?, ?, ?)').run(tournamentId, match.team_a_id, match.team_b_id, 20);
    }

    res.json({ success: true });
  });

  app.delete('/api/tournaments/:id', (req, res) => {
    db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
    broadcast({ type: 'TOURNAMENT_DELETED', id: req.params.id });
    res.json({ success: true });
  });

  // Team API
  app.post('/api/teams', (req, res) => {
    const { name, tournament_id } = req.body;
    const info = db.prepare('INSERT INTO teams (name, tournament_id) VALUES (?, ?)').run(name, tournament_id || null);
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(info.lastInsertRowid);
    broadcast({ type: 'TEAM_CREATED', team });
    res.json(team);
  });

  app.get('/api/teams', (req, res) => {
    const teams = db.prepare('SELECT * FROM teams').all();
    res.json(teams);
  });

  app.get('/api/tournaments/:tournamentId/teams', (req, res) => {
    const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ?').all(req.params.tournamentId);
    res.json(teams);
  });

  app.post('/api/tournaments/:tournamentId/teams', (req, res) => {
    const { name } = req.body;
    const info = db.prepare('INSERT INTO teams (tournament_id, name) VALUES (?, ?)').run(req.params.tournamentId, name);
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(info.lastInsertRowid);
    broadcast({ type: 'TEAM_CREATED', team });
    res.json(team);
  });

  app.get('/api/teams/:id', (req, res) => {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const players = db.prepare('SELECT * FROM players WHERE team_id = ?').all(req.params.id);
    res.json({ ...team, players });
  });

  app.delete('/api/teams/:id', (req, res) => {
    db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    broadcast({ type: 'TEAM_DELETED', id: req.params.id });
    res.json({ success: true });
  });

  // Player API
  app.get('/api/teams/:teamId/players', (req, res) => {
    const players = db.prepare('SELECT * FROM players WHERE team_id = ?').all(req.params.teamId);
    res.json(players);
  });

  app.post('/api/teams/:teamId/players', (req, res) => {
    const { name, is_captain } = req.body;
    const info = db.prepare('INSERT INTO players (team_id, name, is_captain) VALUES (?, ?, ?)').run(req.params.teamId, name, is_captain ? 1 : 0);
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid);
    broadcast({ type: 'PLAYER_CREATED', player });
    res.json(player);
  });

  app.get('/api/players/:id', (req, res) => {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  });

  app.delete('/api/players/:id', (req, res) => {
    db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
    broadcast({ type: 'PLAYER_DELETED', id: req.params.id });
    res.json({ success: true });
  });

  // Match API
  app.get('/api/matches', (req, res) => {
    const matches = db.prepare(`
      SELECT m.*, ta.name as team_a_name, tb.name as team_b_name, t.name as tournament_name
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      ORDER BY m.created_at DESC
    `).all();
    res.json(matches);
  });

  app.post('/api/matches', (req, res) => {
    const { tournament_id, team_a_id, team_b_id, total_overs, wickets } = req.body;
    const info = db.prepare('INSERT INTO matches (tournament_id, team_a_id, team_b_id, total_overs, wickets) VALUES (?, ?, ?, ?, ?)').run(tournament_id || null, team_a_id, team_b_id, total_overs, wickets);
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid);
    broadcast({ type: 'MATCH_CREATED', match });
    res.json(match);
  });

  app.get('/api/matches/:id', (req, res) => {
    const match = db.prepare(`
      SELECT m.*, ta.name as team_a_name, tb.name as team_b_name, t.name as tournament_name
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `).get(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const teamAPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(match.team_a_id);
    const teamBPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(match.team_b_id);

    const balls = db.prepare(`
      SELECT b.*, p_batsman.name as batsman_name, p_bowler.name as bowler_name, p_wicket_taker.name as wicket_taker_name
      FROM balls b
      LEFT JOIN players p_batsman ON b.batsman_id = p_batsman.id
      LEFT JOIN players p_bowler ON b.bowler_id = p_bowler.id
      LEFT JOIN players p_wicket_taker ON b.wicket_taker_id = p_wicket_taker.id
      WHERE b.match_id = ? ORDER BY b.id ASC
    `).all(req.params.id);
    res.json({ ...match, balls, players: { team_a: teamAPlayers, team_b: teamBPlayers } });
  });

  app.post('/api/matches/:id/balls', (req, res) => {
    const { innings_no, over_no, ball_no, runs, extra_runs, extra_type, wicket_type, batsman_id, bowler_id, wicket_taker_id } = req.body;
    db.prepare(`
      INSERT INTO balls (match_id, innings_no, over_no, ball_no, runs, extra_runs, extra_type, wicket_type, batsman_id, bowler_id, wicket_taker_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id, 
      innings_no, 
      over_no, 
      ball_no, 
      runs, 
      extra_runs || 0, 
      extra_type || null, 
      wicket_type || null, 
      batsman_id || null, 
      bowler_id || null, 
      wicket_taker_id || null
    );
    
    const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    const teamAPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(updatedMatch.team_a_id);
    const teamBPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(updatedMatch.team_b_id);

    const balls = db.prepare(`
      SELECT b.*, p_batsman.name as batsman_name, p_bowler.name as bowler_name, p_wicket_taker.name as wicket_taker_name
      FROM balls b
      LEFT JOIN players p_batsman ON b.batsman_id = p_batsman.id
      LEFT JOIN players p_bowler ON b.bowler_id = p_bowler.id
      LEFT JOIN players p_wicket_taker ON b.wicket_taker_id = p_wicket_taker.id
      WHERE b.match_id = ? ORDER BY b.id ASC
    `).all(req.params.id);
    
    broadcast({ type: 'BALL_ADDED', matchId: req.params.id, ball: req.body, fullMatch: { ...updatedMatch, balls, players: { team_a: teamAPlayers, team_b: teamBPlayers } } });
    res.json({ success: true });
  });

  app.delete('/api/matches/:id/balls/last', (req, res) => {
    db.prepare('DELETE FROM balls WHERE id = (SELECT MAX(id) FROM balls WHERE match_id = ?)').run(req.params.id);
    const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    const teamAPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(updatedMatch.team_a_id);
    const teamBPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(updatedMatch.team_b_id);
    
    const balls = db.prepare(`
      SELECT b.*, p_batsman.name as batsman_name, p_bowler.name as bowler_name, p_wicket_taker.name as wicket_taker_name
      FROM balls b
      LEFT JOIN players p_batsman ON b.batsman_id = p_batsman.id
      LEFT JOIN players p_bowler ON b.bowler_id = p_bowler.id
      LEFT JOIN players p_wicket_taker ON b.wicket_taker_id = p_wicket_taker.id
      WHERE b.match_id = ? ORDER BY b.id ASC
    `).all(req.params.id);
    broadcast({ type: 'BALL_REMOVED', matchId: req.params.id, fullMatch: { ...updatedMatch, balls, players: { team_a: teamAPlayers, team_b: teamBPlayers } } });
    res.json({ success: true });
  });

  const getMatchWithNames = (id: number | string) => {
    return db.prepare(`
      SELECT m.*, ta.name as team_a_name, tb.name as team_b_name, t.name as tournament_name
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `).get(id);
  };

  app.patch('/api/matches/:id/toss', (req, res) => {
    const { toss_winner_id, toss_decision } = req.body;
    db.prepare('UPDATE matches SET toss_winner_id = ?, toss_decision = ? WHERE id = ?')
      .run(toss_winner_id, toss_decision, req.params.id);
    
    const updatedMatch = getMatchWithNames(req.params.id);
    broadcast({ type: 'MATCH_UPDATED', match: updatedMatch });
    res.json({ success: true });
  });

  app.patch('/api/matches/:id/innings', (req, res) => {
    const { current_innings } = req.body;
    db.prepare('UPDATE matches SET current_innings = ? WHERE id = ?')
      .run(current_innings, req.params.id);
    
    const updatedMatch = getMatchWithNames(req.params.id);
    broadcast({ type: 'MATCH_UPDATED', match: updatedMatch });
    res.json({ success: true });
  });

  app.patch('/api/matches/:id/finish', (req, res) => {
    const { winner_id } = req.body;
    db.prepare('UPDATE matches SET winner_id = ?, status = \'finished\' WHERE id = ?')
      .run(winner_id ? winner_id : null, req.params.id);
    
    const updatedMatch = getMatchWithNames(req.params.id);
    broadcast({ type: 'MATCH_FINISHED', match: updatedMatch });
    res.json({ success: true });
  });

  app.get('/api/tournaments/:id/standings', (req, res) => {
    const tournamentId = req.params.id;
    const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ?').all(tournamentId);
    const matches = db.prepare('SELECT * FROM matches WHERE tournament_id = ? AND status = \'finished\'').all(tournamentId);

    const standings = teams.map(team => {
      const teamMatches = matches.filter(m => m.team_a_id === team.id || m.team_b_id === team.id);
      const wins = matches.filter(m => m.winner_id === team.id).length;
      const losses = teamMatches.length - wins;
      return {
        id: team.id,
        name: team.name,
        played: teamMatches.length,
        wins,
        losses,
        points: wins * 2
      };
    }).sort((a, b) => b.points - a.points || b.wins - a.wins);

    res.json(standings);
  });

  // WebSocket handling
  const clients = new Set<WebSocket>();
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
