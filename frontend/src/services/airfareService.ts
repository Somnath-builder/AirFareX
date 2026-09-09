import type {
  HealthResponse,
  RoutesResponse,
  CheapestResponse,
  PriceIndexResponse,
  AnalyticsResponse,
  SearchResponse,
  LeadTimeResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchFromApi<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[API Connection Failed] Could not fetch ${endpoint}.`, error);
    throw error;
  }
}

export const airfareService = {
  async getHealth(): Promise<HealthResponse> {
    return fetchFromApi<HealthResponse>('/api/health');
  },

  async getAnalytics(): Promise<AnalyticsResponse> {
    return fetchFromApi<AnalyticsResponse>('/api/analytics');
  },

  async getPriceIndex(route?: string): Promise<PriceIndexResponse> {
    const endpoint = route ? `/api/price-index?route=${encodeURIComponent(route)}` : '/api/price-index';
    return fetchFromApi<PriceIndexResponse>(endpoint);
  },

  async getRoutes(): Promise<RoutesResponse> {
    return fetchFromApi<RoutesResponse>('/api/routes');
  },

  async getCheapestFares(origin?: string, destination?: string, travelDate?: string): Promise<CheapestResponse> {
    const params = new URLSearchParams();
    if (origin) params.append('origin', origin);
    if (destination) params.append('destination', destination);
    if (travelDate) params.append('travel_date', travelDate);
    
    const query = params.toString();
    const endpoint = query ? `/api/cheapest?${query}` : '/api/cheapest';
    return fetchFromApi<CheapestResponse>(endpoint);
  },

  
  async getLeadTimeAnalysis(params?: { origin?: string; destination?: string; route?: string; airline?: string }): Promise<LeadTimeResponse> {
    const query = new URLSearchParams();
    if (params?.origin) query.append('origin', params.origin);
    if (params?.destination) query.append('destination', params.destination);
    if (params?.route) query.append('route', params.route);
    if (params?.airline) query.append('airline', params.airline);
    
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchFromApi<LeadTimeResponse>(`/api/lead-time${queryString}`);
  },

  async searchFlights(origin: string, destination: string, travelDate: string): Promise<SearchResponse> {
    const params = new URLSearchParams({
      origin,
      destination,
      travel_date: travelDate,
    });
    
    // Live search endpoint which talks to SerpApi
    return fetchFromApi<SearchResponse>(`/api/search?${params.toString()}`);
  },
};


