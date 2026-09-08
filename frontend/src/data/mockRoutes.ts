import type { RouteStats } from '../types';

export const mockRoutes: RouteStats[] = [
  { route: 'DEL → BOM', avgFare: 5420, dailyChange: 1.4, weeklyChange: 3.8, monthlyChange: 7.2 },
  { route: 'DEL → BLR', avgFare: 5180, dailyChange: -0.4, weeklyChange: 1.7, monthlyChange: 4.3 },
  { route: 'BOM → BLR', avgFare: 4620, dailyChange: 0.8, weeklyChange: 2.1, monthlyChange: 3.9 },
  { route: 'DEL → CCU', avgFare: 4950, dailyChange: 1.1, weeklyChange: 2.5, monthlyChange: 5.1 },
  { route: 'BLR → HYD', avgFare: 3200, dailyChange: -0.2, weeklyChange: 0.5, monthlyChange: 1.8 },
  { route: 'MAA → DEL', avgFare: 5800, dailyChange: 1.5, weeklyChange: 4.2, monthlyChange: 5.9 },
  { route: 'DEL → HYD', avgFare: 4750, dailyChange: -0.5, weeklyChange: -1.2, monthlyChange: -1.8 },
  { route: 'BOM → DEL', avgFare: 5350, dailyChange: -1.1, weeklyChange: -2.0, monthlyChange: -3.1 },
  { route: 'CCU → DEL', avgFare: 5020, dailyChange: 0.3, weeklyChange: 1.1, monthlyChange: 2.4 },
  { route: 'BOM → GOI', avgFare: 3800, dailyChange: 0.5, weeklyChange: 2.8, monthlyChange: 4.5 },
  { route: 'DEL → GOI', avgFare: 6100, dailyChange: 2.1, weeklyChange: 5.4, monthlyChange: 6.8 },
  { route: 'BLR → MAA', avgFare: 2900, dailyChange: -0.8, weeklyChange: -1.5, monthlyChange: -2.4 },
];
