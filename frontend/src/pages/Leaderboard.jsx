// frontend/src/pages/Leaderboard.jsx
import { useEffect, useState } from "react";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/leaderboard`);
        const data = await res.json();
        setLeaderboard(data.leaderboard);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <p className="text-center mt-8">Loading leaderboard...</p>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">🏆 Leaderboard</h1>
      <div className="overflow-auto">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 border">Rank</th>
              <th className="px-2 py-1 border">Player</th>
              {[...Array(38)].map((_, i) => (
                <th key={i} className="px-2 py-1 border text-xs">GW{i + 1}</th>
              ))}
              <th className="px-2 py-1 border">Total</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, idx) => (
              <tr key={user.player} className="text-center">
                <td className="border px-1 py-1">{user.rank}</td>
                <td className="border px-1 py-1 text-left">{user.player}</td>
                {[...Array(38)].map((_, i) => (
                  <td key={i} className="border px-1 py-1 text-sm">
                    {user[`week_${i + 1}`] || 0}
                  </td>
                ))}
                <td className="border px-1 py-1 font-semibold">{user.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
