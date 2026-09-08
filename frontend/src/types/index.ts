// Old Mock Types (kept for fallback compatibility temporarily if needed)
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

// ==========================================
// NEW BACKEND FASTAPI TYPES
// ==========================================

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
}

export interface BackendRoute {
  origin: string;
  destination: string;
  distance: number;
  type: string;
  operations: number;
  average_fare?: number;
  observation_count?: number;
  minimum_fare?: number;
}

export interface RoutesResponse {
  count: number;
  routes: BackendRoute[];
}

export interface CheapestFare {
  origin: string;
  destination: string;
  travel_date: string;
  fare_amount: number;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  stops: number;
}

export interface CheapestResponse {
  count: number;
  flights: CheapestFare[];
}

export interface PriceIndexPoint {
  period: string;
  average_fare: number;
  index: number;
  route?: string;
}

export interface PriceIndexResponse {
  count: number;
  data: PriceIndexPoint[];
}

export interface AirlineAnalytic {
  airline: string;
  observations: number;
  average_fare: number;
}

export interface AnalyticsResponse {
  total_observations: number;
  unique_routes: number;
  origin_airports: number;
  average_fare: number;
  minimum_fare: number;
  maximum_fare: number;
  airlines: AirlineAnalytic[];
}

export interface FlightSegment {
  flight_number?: string;
  airline?: string;
  departure_airport?: { name?: string; id?: string; time?: string };
  arrival_airport?: { name?: string; id?: string; time?: string };
  duration?: number;
  airplane?: string;
}

export interface SearchFlightOption {
  price: number;
  currency: string;
  total_duration_minutes: number;
  stops: number;
  flights: FlightSegment[];
}

export interface SearchResponse {
  origin: string;
  destination: string;
  travel_date: string;
  source: string;
  near_real_time: boolean;
  count: number;
  cheapest: SearchFlightOption | null;
  flights: SearchFlightOption[];
}


