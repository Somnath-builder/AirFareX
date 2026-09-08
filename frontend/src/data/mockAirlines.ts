import type { AirlineStats } from '../types';

export const mockAirlines: AirlineStats[] = [
  { airline: 'IndiGo', avgFare: 4980, momChange: 3.4, routesCount: 22, shareOfObservations: 55 },
  { airline: 'Air India', avgFare: 5420, momChange: 5.1, routesCount: 18, shareOfObservations: 20 },
  { airline: 'Air India Express', avgFare: 4720, momChange: 2.8, routesCount: 14, shareOfObservations: 12 },
  { airline: 'Akasa Air', avgFare: 4610, momChange: 1.9, routesCount: 11, shareOfObservations: 8 },
  { airline: 'SpiceJet', avgFare: 4850, momChange: 4.2, routesCount: 9, shareOfObservations: 5 },
];
