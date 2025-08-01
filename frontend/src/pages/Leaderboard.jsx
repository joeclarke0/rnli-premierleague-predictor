import { useState, useEffect } from 'react'
import api from '../services/api'

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await api.getLeaderboard()
      setLeaderboard(response.leaderboard || [])
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const getPlayerDetails = (player) => {
    const gameweeks = []
    for (let i = 1; i <= 38; i++) {
      const score = player[`week_${i}`] || 0
      gameweeks.push({ week: i, score })
    }
    return gameweeks
  }

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-1'
    if (rank === 2) return 'rank-2'
    if (rank === 3) return 'rank-3'
    return 'rank-other'
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="loading-spinner"></div>
        <p className="mt-6 text-xl">Loading leaderboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="message error">{error}</div>
        <button onClick={loadLeaderboard} className="btn-primary mt-4">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1>Premier League Leaderboard</h1>
        <p className="text-lg">
          Current standings in the RNLI prediction league
        </p>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Total Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player) => (
              <tr key={player.player}>
                <td>
                  <div className={`rank-badge ${getRankClass(player.rank)}`}>
                    {player.rank}
                  </div>
                </td>
                <td>
                  <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                    {player.player}
                  </div>
                </td>
                <td>
                  <div className="font-bold text-xl" style={{ color: 'var(--rnli-orange)' }}>
                    {player.total}
                  </div>
                </td>
                <td>
                  <button
                    onClick={() => setSelectedPlayer(selectedPlayer === player.player ? null : player.player)}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                  >
                    {selectedPlayer === player.player ? 'Hide' : 'View'} Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPlayer && (
        <div className="card p-6 mt-8">
          <h3 className="mb-4">
            {selectedPlayer} - Gameweek Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
            {getPlayerDetails(leaderboard.find(p => p.player === selectedPlayer)).map(({ week, score }) => (
              <div key={week} className="text-center p-3" style={{ 
                background: score > 0 ? 'var(--rnli-light-blue)' : 'var(--rnli-gray)', 
                borderRadius: '10px',
                border: score > 0 ? '1px solid var(--rnli-blue)' : '1px solid var(--rnli-border)'
              }}>
                <div className="text-sm font-medium" style={{ color: 'var(--rnli-blue)' }}>GW {week}</div>
                <div className={`text-lg font-bold ${
                  score > 0 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {leaderboard.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl">No leaderboard data available</p>
        </div>
      )}

      {/* Scoring System Footer */}
      <div className="text-center mt-12 pt-8" style={{ borderTop: '1px solid var(--rnli-border)' }}>
        <p className="text-sm" style={{ color: 'var(--rnli-dark-gray)' }}>
          <span style={{ color: 'var(--rnli-orange)', fontWeight: '600' }}>5 points</span> for exact score • 
          <span style={{ color: 'var(--rnli-blue)', fontWeight: '600' }}> 2 points</span> for correct result • 
          <span style={{ color: 'var(--rnli-dark-gray)', fontWeight: '600' }}> 0 points</span> for incorrect
        </p>
      </div>
    </div>
  )
}

export default Leaderboard 