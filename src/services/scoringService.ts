import { db } from '../db';
import { Ball, Match } from '../types';

export const addBall = async (matchId: string, currentInnings: number, totalBalls: number, batsmanId: string | null, bowlerId: string | null, ballData: Partial<Ball>, batsmanName?: string, bowlerName?: string) => {
  const nextBallNo = (totalBalls % 6) + 1;
  const nextOverNo = Math.floor(totalBalls / 6);
  try {
    await db.balls.add({
      match_id: matchId,
      innings_no: currentInnings,
      over_no: nextOverNo,
      ball_no: nextBallNo,
      runs: 0,
      extra_runs: 0,
      extra_type: null,
      wicket_type: null,
      batsman_id: batsmanId || 'unknown_batsman',
      bowler_id: bowlerId || 'unknown_bowler',
      batsman_name: batsmanName,
      bowler_name: bowlerName,
      timestamp: new Date().toISOString(),
      ...ballData
    } as any);
  } catch (err) {
    console.error('Failed to add ball:', err);
  }
};

export const undoLast = async (matchId: string, balls: Ball[]) => {
  try {
    const lastBall = balls[balls.length - 1];
    if (!lastBall) return;
    await db.balls.delete(lastBall.id);
  } catch (err) {
    console.error('Failed to undo ball:', err);
  }
};

export const declareResult = async (match: Match) => {
  try {
    const allBalls = await db.balls.where('match_id').equals(match.id).toArray();
    const innings1Runs = allBalls.filter(b => b.innings_no === 1).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
    const innings2Runs = allBalls.filter(b => b.innings_no === 2).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
    const innings3Runs = allBalls.filter(b => b.innings_no === 3).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);
    const innings4Runs = allBalls.filter(b => b.innings_no === 4).reduce((sum, b) => sum + b.runs + b.extra_runs, 0);

    const teamATotal = (match.toss_decision === 'bat' ? innings1Runs + innings3Runs : innings2Runs + innings4Runs);
    const teamBTotal = (match.toss_decision === 'bowl' ? innings1Runs + innings3Runs : innings2Runs + innings4Runs);

    let winnerId = null;
    if (teamATotal > teamBTotal) winnerId = match.team_a_id;
    else if (teamBTotal > teamATotal) winnerId = match.team_b_id;
    else winnerId = null; // Tie

    await db.matches.update(match.id, {
      status: 'finished',
      winner_id: winnerId as string
    });
  } catch (err) {
    console.error('Failed to declare result:', err);
  }
};
