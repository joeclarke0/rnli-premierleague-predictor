import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <Router>
      <div>
        <h1>RNLI Premier League Predictor</h1>
        <p>Frontend setup complete 🚀</p>

        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </Router>
  );
}
