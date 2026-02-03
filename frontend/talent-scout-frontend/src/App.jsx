// src/App.jsx - Updated with new routes
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Rankings from './pages/Rankings';
import ComparePlayers from './pages/ComparePlayers';
import Analytics from './pages/Analytics';
import Watchlist from './pages/Watchlist';
import PlayerDetail from './pages/PlayerDetail';
import ScoutingReport from './pages/ScoutingReport';
import Shotmap from './pages/Shotmap';
import TeamDetail from './pages/TeamDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="players" element={<Players />} />
          <Route path="player/:id" element={<PlayerDetail />} />
          <Route path="scouting-report/:id" element={<ScoutingReport />} />
          <Route path="shotmap/:id" element={<Shotmap />} />
          <Route path="teams" element={<Teams />} />
          <Route path="team/:teamName" element={<TeamDetail />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="compare" element={<ComparePlayers />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="watchlist" element={<Watchlist />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;