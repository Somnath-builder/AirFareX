import type { IndexPoint } from '../types';

export const mockIndexTrend: IndexPoint[] = [
  { date: '2026-03-01', index: 100.0 },
  { date: '2026-04-01', index: 102.3 },
  { date: '2026-05-01', index: 105.1 },
  { date: '2026-06-01', index: 110.8 },
  { date: '2026-07-01', index: 118.2 },
  { date: '2026-08-01', index: 121.5 },
  { date: '2026-09-01', index: 127.4 },
];

export const mockCurrentIndex = {
  value: 127.4,
  basePeriod: 100,
  currentPeriod: 'September 2026',
  monthlyChange: 4.8,
  dailyChange: 1.2,
  averageFare: 5284,
  averageFareChange: 3.6,
  routesTracked: 24,
  airlinesTracked: 5,
};

export const mockRouteContributions = [
  { route: 'DEL-BOM', contribution: 1.2 },
  { route: 'DEL-BLR', contribution: 0.8 },
  { route: 'BOM-BLR', contribution: 0.6 },
  { route: 'DEL-CCU', contribution: 0.4 },
  { route: 'Others', contribution: 1.8 },
];

export const mockRouteWeights = [
  { route: 'DEL-BOM', weight: 20 },
  { route: 'DEL-BLR', weight: 18 },
  { route: 'BOM-BLR', weight: 15 },
  { route: 'DEL-CCU', weight: 12 },
  { route: 'BLR-HYD', weight: 10 },
  { route: 'Others', weight: 25 },
];
