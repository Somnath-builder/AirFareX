import { mockIndexTrend, mockCurrentIndex, mockRouteContributions, mockRouteWeights } from '../data/mockIndexData';
import { mockRoutes } from '../data/mockRoutes';
import { mockAirlines } from '../data/mockAirlines';
import { mockLeadTime } from '../data/mockLeadTime';
import { mockObservations } from '../data/mockObservations';

// Configuration
// VITE_API_URL should point to the FastAPI backend (e.g., http://localhost:8000)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// By default, we use mock data if the backend isn't ready. 
// Set VITE_USE_MOCK_DATA=false in .env to enforce real API calls.
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.VITE_USE_MOCK_DATA === undefined;

// Helper to simulate API delay for mock data
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generic fetch wrapper to handle API calls with a graceful fallback to mock data.
 * This makes it easy for the frontend to switch between the real FastAPI backend
 * and local mock data during development.
 */
async function fetchFromApi<T>(endpoint: string, mockFallback: T): Promise<T> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return mockFallback;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn(`[API Connection Failed] Could not fetch ${endpoint}. Falling back to mock data.`, error);
    // Graceful fallback to mock data if backend isn't running or throws an error
    return mockFallback;
  }
}

export const airfareService = {
  async getIndexData() {
    return fetchFromApi('/api/index-data', {
      trend: mockIndexTrend,
      current: mockCurrentIndex,
      contributions: mockRouteContributions,
      weights: mockRouteWeights,
    });
  },

  async getRoutes() {
    return fetchFromApi('/api/routes', mockRoutes);
  },

  async getRouteDetails(route: string) {
    const mockDetail = mockRoutes.find(r => r.route === route) || mockRoutes[0];
    return fetchFromApi(`/api/routes/${encodeURIComponent(route)}`, mockDetail);
  },

  async getAirlines() {
    return fetchFromApi('/api/airlines', mockAirlines);
  },

  async getLeadTimeData() {
    return fetchFromApi('/api/lead-time', mockLeadTime);
  },

  async getObservations() {
    return fetchFromApi('/api/observations', mockObservations);
  },
};
