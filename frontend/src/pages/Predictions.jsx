import { useState, useEffect } from 'react'
import api from '../services/api'
import sessionManager from '../utils/session'

const Predictions = ({ currentUser }) => {
  const [fixtures, setFixtures] = useState([])
  const [predictions, setPredictions] = useState({})
  const [selectedGameweek, setSelectedGameweek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [gameweekSubmitted, setGameweekSubmitted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [submittedThisSession, setSubmittedThisSession] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

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
      
      // Load existing predictions for this gameweek
      if (currentUser) {
        const userId = currentUser.id || currentUser // Handle both object and string
        const token = sessionManager.getToken()
        const predictionsResponse = await api.getPredictions(userId, selectedGameweek, token)
        const existingPredictions = {}
        let hasPredictions = false
        
        predictionsResponse.predictions?.forEach(pred => {
          if (pred.gameweek === selectedGameweek) {
            existingPredictions[pred.fixture_id] = {
              id: pred.id,
              home: pred.predicted_home,
              away: pred.predicted_away
            }
            hasPredictions = true
          }
        })
        
        setPredictions(existingPredictions)
        setGameweekSubmitted(hasPredictions)
        setSubmittedThisSession(false) // Reset for new gameweek
        
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
    // Clear any previous validation errors for this field
    setValidationErrors(prev => ({
      ...prev,
      [`${fixtureId}-${field}`]: null
    }))
    
    // Validate input: only allow numbers 0-100
    let validatedValue = 0
    
    if (value === '') {
      validatedValue = 0
    } else {
      // Check for non-numeric characters (letters, symbols, etc.)
      if (!/^\d+$/.test(value)) {
        setValidationErrors(prev => ({
          ...prev,
          [`${fixtureId}-${field}`]: 'Enter value between 0-100'
        }))
        return // Don't update if non-numeric
      }
      
      // Check for valid number range
      const numValue = parseInt(value)
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        validatedValue = numValue
      } else {
        // Set validation error
        setValidationErrors(prev => ({
          ...prev,
          [`${fixtureId}-${field}`]: 'Enter value between 0-100'
        }))
        return // Don't update if invalid
      }
    }
    
    setPredictions(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: validatedValue
      }
    }))
  }

  const handleSubmit = async () => {
    if (!currentUser) {
      setMessage('Please log in to submit predictions')
      return
    }

    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some(error => error !== null)
    if (hasErrors) {
      setMessage('❌ Please fix validation errors before submitting')
      return
    }

    // Regular users can't resubmit, admins can override
    if (gameweekSubmitted && !isAdmin) {
      setMessage('Predictions already submitted for this gameweek')
      return
    }

    try {
      setSubmitting(true)
      setMessage('')

      const userId = currentUser.id || currentUser // Handle both object and string
      const token = sessionManager.getToken()

      // Create predictions for ALL fixtures in the gameweek, using 0-0 as default
      const predictionsToSubmit = fixtures.map(fixture => ({
        user_id: userId,
        gameweek: selectedGameweek,
        fixture_id: fixture.id,
        predicted_home: predictions[fixture.id]?.home || 0,
        predicted_away: predictions[fixture.id]?.away || 0
      }))

      for (const prediction of predictionsToSubmit) {
        await api.submitPrediction(prediction, token)
      }

      setGameweekSubmitted(true)
      setSubmittedThisSession(true)
      setMessage('✅ Predictions submitted successfully!')
    } catch (error) {
      console.error('Error submitting predictions:', error)
      setMessage('Error submitting predictions')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePrediction = async (predictionId) => {
    if (!isAdmin) {
      setMessage('Only admins can delete predictions')
      return
    }

    try {
      const token = sessionManager.getToken()
      await api.deletePrediction(predictionId, token)
      setMessage('✅ Prediction deleted successfully')
      loadFixtures() // Reload to refresh the state
    } catch (error) {
      console.error('Error deleting prediction:', error)
      setMessage('Error deleting prediction')
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
    <div className="predictions-container">
      {/* Header Section */}
      <div className="predictions-header">
        <div className="header-content">
          <h1 className="page-title">Make Predictions</h1>
          <p className="page-subtitle">
            Select your predicted scores for Gameweek {selectedGameweek}
          </p>
          
          {/* Admin Badge */}
          {isAdmin && (
            <div className="admin-indicator">
              <span className="admin-icon">🔧</span>
              <span className="admin-text">Admin Mode - Can Override Submissions</span>
            </div>
          )}
        </div>
        
        {/* Gameweek Selector */}
        <div className="gameweek-selector">
          <label className="selector-label">
            Select Gameweek:
          </label>
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
            className="gameweek-select"
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
        <div className={`status-message ${message.includes('Error') ? 'error' : message.includes('already submitted') ? 'warning' : 'success'}`}>
          {message}
        </div>
      )}
      
      {/* Fixtures Section */}
      {fixtures.length > 0 && (
        <div className="fixtures-section">
          <div className="fixtures-header">
            <h2 className="section-title">Match Predictions</h2>
            <p className="section-subtitle">
              Enter your predicted scores for each match
            </p>
          </div>
          
          <div className="fixtures-grid">
            {fixtures.map((fixture) => {
              const hasPrediction = predictions[fixture.id]
              const showEntered = (gameweekSubmitted && hasPrediction) || (submittedThisSession && hasPrediction)
              return (
                <div key={fixture.id} className="fixture-card">
                  <div className="fixture-header">
                    <div className="match-info">
                      <div className="match-date">
                        {formatDate(fixture.date)}
                      </div>
                      <div className="match-time">
                        {formatTime(fixture.kickoff_time)}
                      </div>
                    </div>
                    <div className="prediction-status">
                      <span className={`status-badge ${showEntered ? 'entered' : 'pending'}`}>
                        {showEntered ? 'Entered' : 'Pending'}
                      </span>
                    </div>
                    {isAdmin && gameweekSubmitted && predictions[fixture.id]?.id && (
                      <button
                        onClick={() => handleDeletePrediction(predictions[fixture.id].id)}
                        className="delete-btn"
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                  
                  <div className="teams-section">
                    <div className="team home-team">
                      <div className="team-name">{fixture.home_team}</div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={predictions[fixture.id]?.home ?? 0}
                        onChange={(e) => handlePredictionChange(fixture.id, 'home', e.target.value)}
                        onBlur={(e) => {
                          // Validate on blur and show errors for invalid values
                          const value = e.target.value
                          if (value === '') {
                            handlePredictionChange(fixture.id, 'home', '0')
                          } else {
                            // Check for non-numeric characters
                            if (!/^\d+$/.test(value)) {
                              setValidationErrors(prev => ({
                                ...prev,
                                [`${fixture.id}-home`]: 'Enter value between 0-100'
                              }))
                              return
                            }
                            
                            const numValue = parseInt(value)
                            if (numValue < 0 || numValue > 100) {
                              setValidationErrors(prev => ({
                                ...prev,
                                [`${fixture.id}-home`]: 'Enter value between 0-100'
                              }))
                              return
                            }
                            
                            // If valid, update the prediction
                            handlePredictionChange(fixture.id, 'home', value)
                          }
                        }}
                        className={`score-input home-score ${validationErrors[`${fixture.id}-home`] ? 'error' : ''}`}
                        placeholder="0"
                        disabled={gameweekSubmitted && !isAdmin}
                      />
                      {validationErrors[`${fixture.id}-home`] && (
                        <div className="validation-error">
                          {validationErrors[`${fixture.id}-home`]}
                        </div>
                      )}
                    </div>
                    
                    <div className="score-divider">
                      <span className="vs-text">vs</span>
                    </div>
                    
                    <div className="team away-team">
                      <div className="team-name">{fixture.away_team}</div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={predictions[fixture.id]?.away ?? 0}
                        onChange={(e) => handlePredictionChange(fixture.id, 'away', e.target.value)}
                        onBlur={(e) => {
                          // Validate on blur and show errors for invalid values
                          const value = e.target.value
                          if (value === '') {
                            handlePredictionChange(fixture.id, 'away', '0')
                          } else {
                            // Check for non-numeric characters
                            if (!/^\d+$/.test(value)) {
                              setValidationErrors(prev => ({
                                ...prev,
                                [`${fixture.id}-away`]: 'Enter value between 0-100'
                              }))
                              return
                            }
                            
                            const numValue = parseInt(value)
                            if (numValue < 0 || numValue > 100) {
                              setValidationErrors(prev => ({
                                ...prev,
                                [`${fixture.id}-away`]: 'Enter value between 0-100'
                              }))
                              return
                            }
                            
                            // If valid, update the prediction
                            handlePredictionChange(fixture.id, 'away', value)
                          }
                        }}
                        className={`score-input away-score ${validationErrors[`${fixture.id}-away`] ? 'error' : ''}`}
                        placeholder="0"
                        disabled={gameweekSubmitted && !isAdmin}
                      />
                      {validationErrors[`${fixture.id}-away`] && (
                        <div className="validation-error">
                          {validationErrors[`${fixture.id}-away`]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Submit Section */}
      {fixtures.length > 0 && (!gameweekSubmitted || isAdmin) && (
        <div className="submit-section">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? 'Submitting...' : isAdmin && gameweekSubmitted ? 'Override Predictions' : 'Submit Predictions'}
          </button>
          <p className="submit-hint">
            💡 Leave fields empty for 0-0 predictions
            {isAdmin && gameweekSubmitted && (
              <span className="admin-hint"> • Admin can override existing submissions</span>
            )}
          </p>
        </div>
      )}

      {fixtures.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⚽</div>
          <h3 className="empty-title">No Fixtures Found</h3>
          <p className="empty-text">No fixtures found for Gameweek {selectedGameweek}</p>
        </div>
      )}
      
      {/* Instructions Footer */}
      <div className="instructions-footer">
        <div className="instructions-content">
          <h4 className="instructions-title">How It Works</h4>
          <p className="instructions-text">
            Enter your predicted scores for each match. Empty fields will be treated as 0-0 predictions.
            {isAdmin && (
              <span className="admin-instruction"> Admins can override existing submissions.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Predictions 