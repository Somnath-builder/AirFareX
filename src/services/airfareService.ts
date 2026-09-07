import { mockIndexTrend, mockCurrentIndex, mockRouteContributions, mockRouteWeights } from '../data/mockIndexData';
import { mockRoutes } from '../data/mockRoutes';
import { mockAirlines } from '../data/mockAirlines';
import { mockLeadTime } from '../data/mockLeadTime';
import { mockObservations } from '../data/mockObservations';

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const airfareService = {
  async getIndexData() {
    await delay(300);
    return {
      trend: mockIndexTrend,
      current: mockCurrentIndex,
      contributions: mockRouteContributions,
      weights: mockRouteWeights,
    };
  },

  async getRoutes() {
    await delay(300);
    return mockRoutes;
  },

  async getRouteDetails(route: string) {
    await delay(300);
    // Find specific route or return a generic mock
    return mockRoutes.find(r => r.route === route) || mockRoutes[0];
  },

  async getAirlines() {
    await delay(300);
    return mockAirlines;
  },

  async getLeadTimeData() {
    await delay(300);
    return mockLeadTime;
  },

  async getObservations() {
    await delay(300);
    return mockObservations;
  },
};
