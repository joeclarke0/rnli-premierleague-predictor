import { useEffect, useState } from "react";
import { leaderboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await leaderboardAPI.get();
        setLeaderboard(res.data.leaderboard);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rnli-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-rnli-blue">🏆 Leaderboard</h1>
      </div>

      {/* Scoring Legend */}
      <div className="card bg-rnli-yellow bg-opacity-10">
        <h3 className="font-semibold mb-2 text-rnli-blue">Scoring System:</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="font-bold text-green-600">5 pts</span> - Exact score
          </div>
          <div>
            <span className="font-bold text-blue-600">2 pts</span> - Correct result
          </div>
          <div>
            <span className="font-bold text-gray-600">0 pts</span> - Incorrect
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-rnli-blue text-white sticky top-0">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Rank</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Player</th>
              {[...Array(38)].map((_, i) => (
                <th key={i} className="px-2 py-3 text-center text-xs font-semibold">
                  {i + 1}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase bg-rnli-blue-dark">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboard.map((userRow, idx) => {
              const isCurrentUser = user && userRow.player === user.username;
              const isTop3 = userRow.rank <= 3;

              return (
                <tr
                  key={userRow.player}
                  className={`
                    ${isCurrentUser ? 'bg-blue-50 font-semibold' : ''}
                    ${idx % 2 === 0 && !isCurrentUser ? 'bg-gray-50' : ''}
                    hover:bg-blue-100 transition-colors
                  `}
                >
                  <td className="px-3 py-3 whitespace-nowrap text-sm">
                    {isTop3 ? (
                      <span className="text-xl">
                        {userRow.rank === 1 && '🥇'}
                        {userRow.rank === 2 && '🥈'}
                        {userRow.rank === 3 && '🥉'}
                      </span>
                    ) : (
                      <span className="text-gray-600">{userRow.rank}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                    {userRow.player}
                    {isCurrentUser && <span className="ml-2 text-rnli-blue">(You)</span>}
                  </td>
                  {[...Array(38)].map((_, i) => (
                    <td key={i} className="px-2 py-3 text-center text-sm text-gray-600">
                      {userRow[`week_${i + 1}`] || 0}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center font-bold bg-gray-100 text-rnli-blue">
                    {userRow.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {leaderboard.length === 0 && (
        <div className="card text-center py-12 text-gray-600">
          <p>No leaderboard data yet. Start predicting to see scores!</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
