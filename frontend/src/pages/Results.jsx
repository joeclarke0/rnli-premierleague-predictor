import { useState, useEffect } from 'react'
import api from '../services/api'

const Results = ({ currentUser }) => {
  const [fixtures, setFixtures] = useState([])
  const [results, setResults] = useState({})
  const [selectedGameweek, setSelectedGameweek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [gameweekSubmitted, setGameweekSubmitted] = useState(false)

  useEffect(() => {
    loadFixtures()
  }, [selectedGameweek])

  const loadFixtures = async () => {
    try {
      setLoading(true)
      const response = await api.getFixtures(selectedGameweek)
      setFixtures(response.fixtures || [])
      
      // Load existing results for this gameweek
      const resultsResponse = await api.getResults(selectedGameweek)
      const existingResults = {}
      let hasResults = false
      
      resultsResponse.results?.forEach(result => {
        if (result.gameweek === selectedGameweek) {
          existingResults[result.fixture_id] = {
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
    if (gameweekSubmitted) {
      setMessage('Results already submitted for this gameweek')
      return
    }

    try {
      setSubmitting(true)
      setMessage('')

      // Create results for ALL fixtures in the gameweek, using 0-0 as default
      const resultsToSubmit = fixtures.map(fixture => ({
        fixture_id: fixture.id,
        gameweek: selectedGameweek,
        actual_home: results[fixture.id]?.home || 0,
        actual_away: results[fixture.id]?.away || 0
      }))

      for (const result of resultsToSubmit) {
        await api.submitResult(result)
      }

      setGameweekSubmitted(true)
      setMessage('✅ Results submitted successfully!')
    } catch (error) {
      console.error('Error submitting results:', error)
      setMessage('Error submitting results')
    } finally {
      setSubmitting(false)
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
          Enter actual match results for Gameweek {selectedGameweek}
        </p>
        
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
              </tr>
            </thead>
            <tbody>
              {fixtures.map((fixture) => (
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
                        disabled={gameweekSubmitted}
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
                        disabled={gameweekSubmitted}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                      {fixture.away_team}
                    </div>
                  </td>
                  <td>
                    {results[fixture.id] ? (
                      <div className="text-center">
                        <span className="text-sm font-medium" style={{ color: 'var(--rnli-green)' }}>
                          ✓ Entered
                        </span>
                        <div className="text-xs" style={{ color: 'var(--rnli-dark-gray)' }}>
                          {results[fixture.id].home} - {results[fixture.id].away}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-sm" style={{ color: 'var(--rnli-dark-gray)' }}>
                          Pending
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit Button */}
      {fixtures.length > 0 && !gameweekSubmitted && (
        <div className="text-center py-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-secondary"
            style={{ fontSize: '1.1rem', padding: '12px 32px' }}
          >
            {submitting ? 'Submitting...' : 'Submit Results'}
          </button>
          <p className="text-sm mt-4" style={{ color: 'var(--rnli-dark-gray)' }}>
            💡 Leave fields empty for 0-0 results
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
          Enter the actual final scores for each match. These results will be used to calculate prediction points.
        </p>
      </div>
    </div>
  )
}

export default Results 