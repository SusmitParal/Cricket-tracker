export interface Player {
  id: string;
  team_id: string;
  name: string;
  is_captain: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string | null;
  name: string;
  created_at: string;
  players?: Player[];
}

export interface Tournament {
  id: string;
  name: string;
  created_at: string;
  teams?: Team[];
}

export interface Ball {
  id: string;
  match_id: string;
  innings_no: number;
  over_no: number;
  ball_no: number;
  runs: number;
  extra_runs: number;
  extra_type: 'wide' | 'noball' | 'bye' | 'legbye' | null;
  wicket_type: string | null;
  batsman_id: string;
  bowler_id: string;
  wicket_taker_id: string | null;
  batsman_name?: string;
  bowler_name?: string;
  wicket_taker_name?: string;
  timestamp: string;
}

export interface Match {
  id: string;
  tournament_id: string | null;
  team_a_id: string;
  team_b_id: string;
  team_a_name: string;
  team_b_name: string;
  tournament_name?: string;
  total_overs: number;
  wickets: number;
  current_innings: number;
  toss_winner_id?: string;
  toss_decision?: 'bat' | 'bowl';
  winner_id?: string;
  status: 'ongoing' | 'finished';
  created_at: string;
  balls?: Ball[];
  players?: {
    team_a: Player[];
    team_b: Player[];
  };
}
