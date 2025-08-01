import { useState, useEffect } from 'react'
import api from '../services/api'
import sessionManager from '../utils/session'

const Results = ({ currentUser }) => {
  const [fixtures, setFixtures] = useState([])
  const [results, setResults] = useState({})
  const [selectedGameweek, setSelectedGameweek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [gameweekSubmitted, setGameweekSubmitted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    if (currentUser && currentUser.role === 'admin') {
      setIsAdmin(true)
    }
    loadFixtures()
  }, [selectedGameweek, currentUser])

  const loadFixtures = async () => {
    try {
      setLoading(true)
      const response = await api.getFixtures(selectedGameweek)
      setFixtures(response.fixtures || [])
      
      // Load existing results for this gameweek
      const token = sessionManager.getToken()
      const resultsResponse = await api.getResults(selectedGameweek, token)
      const existingResults = {}
      let hasResults = false
      
      resultsResponse.results?.forEach(result => {
        if (result.gameweek === selectedGameweek) {
          existingResults[result.fixture_id] = {
            id: result.id,
            home: result.actual_home,
            away: result.actual_away
          }
          hasResults = true
        }
      })
      
      setResults(existingResults)
      setGameweekSubmitted(hasResults)
      
      if (hasResults) {
        setMessage('✅ Results already submitted for this gameweek')
      } else {
        setMessage('')
      }
    } catch (error) {
      console.error('Error loading fixtures:', error)
      setMessage('Error loading fixtures')
    } finally {
      setLoading(false)
    }
  }

  const handleResultChange = (fixtureId, field, value) => {
    setResults(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: parseInt(value) || 0
      }
    }))
  }

  const handleSubmit = async () => {
    if (!currentUser) {
      setMessage('Please log in to submit results')
      return
    }

    // Only admins can submit results
    if (!isAdmin) {
      setMessage('Only admins can submit results')
      return
    }

    try {
      setSubmitting(true)
      setMessage('')

      const token = sessionManager.getToken()

      // Submit results for ALL fixtures in the gameweek
      // The backend will handle upsert (insert or update) automatically
      const resultsToSubmit = fixtures.map(fixture => ({
        gameweek: selectedGameweek,
        fixture_id: fixture.id,
        actual_home: results[fixture.id]?.home || 0,
        actual_away: results[fixture.id]?.away || 0
      }))

      for (const result of resultsToSubmit) {
        await api.submitResult(result, token)
      }

      setGameweekSubmitted(true)
      setMessage('✅ Results submitted successfully!')
      
      // Reload to get updated data
      await loadFixtures()
    } catch (error) {
      console.error('Error submitting results:', error)
      setMessage('Error submitting results')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteResult = async (resultId) => {
    if (!isAdmin) {
      setMessage('Only admins can delete results')
      return
    }

    try {
      const token = sessionManager.getToken()
      await api.deleteResult(resultId, token)
      setMessage('✅ Result deleted successfully')
      loadFixtures() // Reload to refresh the state
    } catch (error) {
      console.error('Error deleting result:', error)
      setMessage('Error deleting result')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, '.')
  }

  const formatTime = (timeString) => {
    return timeString.substring(0, 5)
  }

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">
            Please log in to view results
          </p>
          <button className="btn-primary">
            Login
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="loading-spinner"></div>
        <p className="mt-6 text-xl">Loading fixtures...</p>
      </div>
    )
  }
  
  return (
    <div>
      <div className="text-center mb-8">
        <h1>Match Results</h1>
        <p className="text-lg">
          {isAdmin ? 'Enter actual scores for Gameweek' : 'View actual scores for Gameweek'} {selectedGameweek}
        </p>
        
        {/* Admin Badge */}
        {isAdmin && (
          <div className="mt-2">
            <span className="inline-block bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              🔧 Admin Mode - Can Manage Results
            </span>
          </div>
        )}
        
        {/* Gameweek Selector */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rnli-blue)' }}>
            Select Gameweek:
          </label>
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
            className="input-field"
            style={{ maxWidth: '200px' }}
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>
                Gameweek {week}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : message.includes('already submitted') ? 'warning' : 'success'} mb-8`}>
          {message}
        </div>
      )}
      
      {fixtures.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Home Team</th>
                <th>Score</th>
                <th>Away Team</th>
                <th>Status</th>
                {isAdmin && gameweekSubmitted && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {fixtures.map((fixture) => {
                const hasResult = results[fixture.id]
                return (
                  <tr key={fixture.id}>
                    <td>
                      <div className="font-medium" style={{ color: 'var(--rnli-blue)' }}>
                        {formatDate(fixture.date)}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">
                        {formatTime(fixture.kickoff_time)}
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                        {fixture.home_team}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={results[fixture.id]?.home || ''}
                          onChange={(e) => handleResultChange(fixture.id, 'home', e.target.value)}
                          className="score-input"
                          placeholder="0"
                          disabled={!isAdmin}
                        />
                        <span className="font-bold" style={{ color: 'var(--rnli-orange)' }}>:</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={results[fixture.id]?.away || ''}
                          onChange={(e) => handleResultChange(fixture.id, 'away', e.target.value)}
                          className="score-input"
                          placeholder="0"
                          disabled={!isAdmin}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                        {fixture.away_team}
                      </div>
                    </td>
                    <td>
                      <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                        hasResult 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {hasResult ? 'Entered' : 'Pending'}
                      </div>
                    </td>
                    {isAdmin && gameweekSubmitted && results[fixture.id]?.id && (
                      <td>
                        <button
                          onClick={() => handleDeleteResult(results[fixture.id].id)}
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {fixtures.length > 0 && isAdmin && (
        <div className="text-center py-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary"
            style={{ fontSize: '1.1rem', padding: '12px 32px' }}
          >
            {submitting ? 'Submitting...' : gameweekSubmitted ? 'Override Results' : 'Submit Results'}
          </button>
          <p className="text-sm mt-4" style={{ color: 'var(--rnli-dark-gray)' }}>
            💡 Leave fields empty for 0-0 results
            {isAdmin && gameweekSubmitted && (
              <span style={{ color: 'var(--rnli-orange)' }}> • Admin can override existing results</span>
            )}
          </p>
        </div>
      )}

      {fixtures.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl">No fixtures found for Gameweek {selectedGameweek}</p>
        </div>
      )}
      
      {/* Instructions Footer */}
      <div className="text-center mt-12 pt-8" style={{ borderTop: '1px solid var(--rnli-border)' }}>
        <p className="text-sm" style={{ color: 'var(--rnli-dark-gray)' }}>
          {isAdmin 
            ? 'Enter actual match results. Empty fields will be treated as 0-0 results. Only admins can manage results.'
            : 'View actual match results for the selected gameweek.'
          }
          {isAdmin && gameweekSubmitted && (
            <span style={{ color: 'var(--rnli-orange)' }}> Admins can override existing results.</span>
          )}
        </p>
      </div>
    </div>
  )
}

export default Results 