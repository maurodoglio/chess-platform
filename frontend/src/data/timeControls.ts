export interface TimeControl {
  id: string;
  name: string;
  category: 'bullet' | 'blitz' | 'rapid';
  baseTimeMs: number;
  incrementMs: number;
}

export const timeControls: TimeControl[] = [
  { id: 'bullet_1_0', name: '1+0', category: 'bullet', baseTimeMs: 60000, incrementMs: 0 },
  { id: 'bullet_2_1', name: '2+1', category: 'bullet', baseTimeMs: 120000, incrementMs: 1000 },
  { id: 'blitz_3_0', name: '3+0', category: 'blitz', baseTimeMs: 180000, incrementMs: 0 },
  { id: 'blitz_5_0', name: '5+0', category: 'blitz', baseTimeMs: 300000, incrementMs: 0 },
  { id: 'blitz_5_2', name: '5+2', category: 'blitz', baseTimeMs: 300000, incrementMs: 2000 },
  { id: 'rapid_10_0', name: '10+0', category: 'rapid', baseTimeMs: 600000, incrementMs: 0 },
  { id: 'rapid_15_10', name: '15+10', category: 'rapid', baseTimeMs: 900000, incrementMs: 10000 },
];

export const timeControlsByCategory = {
  bullet: timeControls.filter(tc => tc.category === 'bullet'),
  blitz: timeControls.filter(tc => tc.category === 'blitz'),
  rapid: timeControls.filter(tc => tc.category === 'rapid'),
};
