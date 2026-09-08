export interface RouteFare {
  origin: string;
  destination: string;
  airline: string;
  travelDate: string;
  bookingWindow: number;
  baseFare: number;
  taxes: number;
  fees: number;
  totalFare: number;
  status: "available" | "sold_out";
}

export interface IndexPoint {
  date: string;
  index: number;
}

export interface AirlineStats {
  airline: string;
  avgFare: number;
  momChange: number; // Monthly change percentage
  routesCount: number;
  shareOfObservations: number; // Percentage
}

export interface LeadTimeData {
  daysBeforeDeparture: number;
  avgFare: number;
}

export interface RouteStats {
  route: string;
  avgFare: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
}

export interface Observation {
  id: string;
  timestamp: string;
  origin: string;
  destination: string;
  airline: string;
  travelDate: string;
  leadTime: string;
  fareClass: string;
  baseFare: number;
  taxes: number;
  fees: number;
  totalFare: number;
  status: string;
}
