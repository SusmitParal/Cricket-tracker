export interface Player {
  id: number;
  team_id: number;
  name: string;
  is_captain: boolean;
  created_at: string;
}

export interface Team {
  id: number;
  tournament_id: number | null;
  name: string;
  created_at: string;
  players?: Player[];
}

export interface Tournament {
  id: number;
  name: string;
  created_at: string;
  teams?: Team[];
}

export interface Ball {
  id: number;
  match_id: number;
  innings_no: number;
  over_no: number;
  ball_no: number;
  runs: number;
  extra_runs: number;
  extra_type: 'wide' | 'noball' | 'bye' | 'legbye' | null;
  wicket_type: string | null;
  batsman_id: number;
  bowler_id: number;
  wicket_taker_id: number | null;
  batsman_name?: string;
  bowler_name?: string;
  wicket_taker_name?: string;
  timestamp: string;
}

export interface Match {
  id: number;
  tournament_id: number | null;
  team_a_id: number;
  team_b_id: number;
  team_a_name: string;
  team_b_name: string;
  tournament_name?: string;
  total_overs: number;
  wickets: number;
  current_innings: number;
  toss_winner_id?: number;
  toss_decision?: 'bat' | 'bowl';
  winner_id?: number;
  status: 'ongoing' | 'finished';
  created_at: string;
  balls?: Ball[];
  players?: {
    team_a: Player[];
    team_b: Player[];
  };
}
