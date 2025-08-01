import { useState, useEffect } from 'react'
import api from '../services/api'

const Predictions = ({ currentUser }) => {
  const [fixtures, setFixtures] = useState([])
  const [predictions, setPredictions] = useState({})
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
      
      // Load existing predictions for this gameweek
      if (currentUser) {
        const userId = currentUser.id || currentUser // Handle both object and string
        const predictionsResponse = await api.getPredictions(userId, selectedGameweek)
        const existingPredictions = {}
        let hasPredictions = false
        
        predictionsResponse.predictions?.forEach(pred => {
          if (pred.gameweek === selectedGameweek) {
            existingPredictions[pred.fixture_id] = {
              home: pred.predicted_home,
              away: pred.predicted_away
            }
            hasPredictions = true
          }
        })
        
        setPredictions(existingPredictions)
        setGameweekSubmitted(hasPredictions)
        
        if (hasPredictions) {
          setMessage('✅ Predictions already submitted for this gameweek')
        } else {
          setMessage('')
        }
      }
    } catch (error) {
      console.error('Error loading fixtures:', error)
      setMessage('Error loading fixtures')
    } finally {
      setLoading(false)
    }
  }

  const handlePredictionChange = (fixtureId, field, value) => {
    setPredictions(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: parseInt(value) || 0
      }
    }))
  }

  const handleSubmit = async () => {
    if (!currentUser) {
      setMessage('Please log in to submit predictions')
      return
    }

    if (gameweekSubmitted) {
      setMessage('Predictions already submitted for this gameweek')
      return
    }

    try {
      setSubmitting(true)
      setMessage('')

      const userId = currentUser.id || currentUser // Handle both object and string

      // Create predictions for ALL fixtures in the gameweek, using 0-0 as default
      const predictionsToSubmit = fixtures.map(fixture => ({
        user_id: userId,
        gameweek: selectedGameweek,
        fixture_id: fixture.id,
        predicted_home: predictions[fixture.id]?.home || 0,
        predicted_away: predictions[fixture.id]?.away || 0
      }))

      for (const prediction of predictionsToSubmit) {
        await api.submitPrediction(prediction)
      }

      setGameweekSubmitted(true)
      setMessage('✅ Predictions submitted successfully!')
    } catch (error) {
      console.error('Error submitting predictions:', error)
      setMessage('Error submitting predictions')
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

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">
            Please log in to submit predictions
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
        <h1>Make Predictions</h1>
        <p className="text-lg">
          Select your predicted scores for Gameweek {selectedGameweek}
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
                        value={predictions[fixture.id]?.home || ''}
                        onChange={(e) => handlePredictionChange(fixture.id, 'home', e.target.value)}
                        className="score-input"
                        placeholder="0"
                        disabled={gameweekSubmitted}
                      />
                      <span className="font-bold" style={{ color: 'var(--rnli-orange)' }}>:</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={predictions[fixture.id]?.away || ''}
                        onChange={(e) => handlePredictionChange(fixture.id, 'away', e.target.value)}
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
            className="btn-primary"
            style={{ fontSize: '1.1rem', padding: '12px 32px' }}
          >
            {submitting ? 'Submitting...' : 'Submit Predictions'}
          </button>
          <p className="text-sm mt-4" style={{ color: 'var(--rnli-dark-gray)' }}>
            💡 Leave fields empty for 0-0 predictions
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
          Enter your predicted scores for each match. Empty fields will be treated as 0-0 predictions.
        </p>
      </div>
    </div>
  )
}

export default Predictions 