// src/services/api.js - UPDATED VERSION

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = {
  // Health check
  healthCheck: () => axios.get(`${API_BASE_URL}/health`),
  
  // Stats
  getStats: () => axios.get(`${API_BASE_URL}/stats`),
  
  // Players with pagination
  getPlayers: (page = 1, perPage = 50, position = null) => {
    const params = { page, per_page: perPage };
    if (position && position !== 'All') params.position = position;
    return axios.get(`${API_BASE_URL}/players`, { params });
  },
  
  // Search players
  searchPlayers: (query, position = null) => {
    const params = { q: query };
    if (position && position !== 'All') params.position = position;
    return axios.get(`${API_BASE_URL}/players/search`, { params });
  },
  
  // Get player by ID
  getPlayerById: (id) => axios.get(`${API_BASE_URL}/players/${id}`),
  
  // Get player's BEST season
  getPlayerBestSeason: (playerName) => 
    axios.get(`${API_BASE_URL}/players/${encodeURIComponent(playerName)}/best`),
  
  // Get player progression
  getPlayerProgression: (playerName) => 
    axios.get(`${API_BASE_URL}/players/${encodeURIComponent(playerName)}/progression`),
  
  // Position rankings
  getPositionRankings: (position = 'FW', limit = 25) =>
    axios.get(`${API_BASE_URL}/positions/rankings`, {
      params: { position, limit }
    }),
  
  // Position summary
  getPositionsSummary: () => axios.get(`${API_BASE_URL}/positions/summary`),
  
  // Compare players
  comparePlayers: (playerIds) =>
    axios.post(`${API_BASE_URL}/compare`, { player_ids: playerIds }),
  
  // Watchlist
  getWatchlist: () => axios.get(`${API_BASE_URL}/watchlist`),
  addToWatchlist: (playerId) => 
    axios.post(`${API_BASE_URL}/watchlist/add`, { player_id: playerId }),
  removeFromWatchlist: (playerId) =>
    axios.delete(`${API_BASE_URL}/watchlist/remove/${playerId}`),
  
  // Export
  exportPlayers: (filters) =>
    axios.post(`${API_BASE_URL}/export/players`, filters, {
      responseType: 'blob'
    }),
  
  // Recalculate potential
  recalculatePotential: (playerId) =>
    axios.post(`${API_BASE_URL}/players/${playerId}/recalculate`),
  
  // Teams
  getTeams: () => axios.get(`${API_BASE_URL}/teams`),
  getTeamAnalytics: (teamName) =>
    axios.get(`${API_BASE_URL}/team/${encodeURIComponent(teamName)}`),
  
  // Scouting report
  getScoutingReport: (playerId) =>
    axios.get(`${API_BASE_URL}/scouting-report/${playerId}`),
  
  // Shotmap
  getShotmap: (playerId) => axios.get(`${API_BASE_URL}/shotmap/${playerId}`),
  
  // Metadata
  getSeasons: () => axios.get(`${API_BASE_URL}/seasons`),
  getClubs: () => axios.get(`${API_BASE_URL}/clubs`),
  getPositions: () => axios.get(`${API_BASE_URL}/positions`)
};

export default api;