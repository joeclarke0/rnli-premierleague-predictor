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
  const [validationErrors, setValidationErrors] = useState({})

  // Team logo mapping function
  const getTeamLogo = (teamName) => {
    const logoMap = {
      'Arsenal': 'Arsenal logo.svg',
      'Aston Villa': 'Aston Villa Logo.svg',
      'AFC Bournemouth': 'Bournemouth Logo.svg',
      'Brentford': 'Brentford logo.svg',
      'Brighton & Hove Albion': 'Brighton logo.svg',
      'Burnley': 'Burnley logo.svg',
      'Chelsea': 'Chelsea logo.svg',
      'Everton': 'Everton logo.svg',
      'Fulham': 'Fulham logo.svg',
      'Liverpool': 'liverpool logo.svg',
      'Luton Town': 'Luton logo.svg',
      'Manchester City': 'mancity logo.svg',
      'Manchester United': 'united logo.svg',
      'Newcastle United': 'saudi logo.svg',
      'Nottingham Forest': 'forrest logo.png',
      'Sheffield United': 'Sheffield United logo.svg',
      'Tottenham Hotspur': 'spurs logo.svg',
      'West Ham United': 'hammers logo.svg',
      'Wolverhampton Wanderers': 'Wolves logo.svg'
    }
    return logoMap[teamName] || null
  }

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
    
    setResults(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: validatedValue
      }
    }))
  }

  const handleSubmit = async () => {
    if (!currentUser) {
      setMessage('Please log in to submit results')
      return
    }

    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some(error => error !== null)
    if (hasErrors) {
      setMessage('❌ Please fix validation errors before submitting')
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
    <div className="results-container">
      {/* Header Section */}
      <div className="results-header">
        <div className="header-content">
          <h1 className="page-title">Match Results</h1>
          <p className="page-subtitle">
            {isAdmin ? 'Enter actual scores for Gameweek' : 'View actual scores for Gameweek'} {selectedGameweek}
          </p>
          
          {/* Admin Badge */}
          {isAdmin && (
            <div className="admin-indicator">
              <span className="admin-icon">🔧</span>
              <span className="admin-text">Admin Mode - Can Manage Results</span>
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
      
      {/* Results Section */}
      {fixtures.length > 0 && (
        <div className="results-section">
          <div className="results-header-section">
            <h2 className="section-title">Match Results</h2>
            <p className="section-subtitle">
              {isAdmin ? 'Enter actual scores for each match' : 'View actual scores for each match'}
            </p>
          </div>
          
          <div className="results-grid">
            {fixtures.map((fixture) => {
              const hasResult = results[fixture.id]
              return (
                <div key={fixture.id} className="result-card">
                  <div className="result-header">
                    <div className="match-info">
                      <div className="match-date">
                        {formatDate(fixture.date)}
                      </div>
                      <div className="match-time">
                        {formatTime(fixture.kickoff_time)}
                      </div>
                    </div>
                    <div className="result-status">
                      <span className={`status-badge ${hasResult ? 'entered' : 'pending'}`}>
                        {hasResult ? 'Entered' : 'Pending'}
                      </span>
                    </div>
                    {isAdmin && gameweekSubmitted && results[fixture.id]?.id && (
                      <button
                        onClick={() => handleDeleteResult(results[fixture.id].id)}
                        className="delete-btn"
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                  
                  <div className="teams-section">
                    <div className="team home-team">
                      <div className="team-info">
                        {getTeamLogo(fixture.home_team) && (
                          <img 
                            src={`/${getTeamLogo(fixture.home_team)}`} 
                            alt={`${fixture.home_team} logo`}
                            className="team-logo"
                          />
                        )}
                        <div className="team-name">{fixture.home_team}</div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={results[fixture.id]?.home ?? 0}
                        onChange={(e) => handleResultChange(fixture.id, 'home', e.target.value)}
                        onBlur={(e) => {
                          // Validate on blur and show errors for invalid values
                          const value = e.target.value
                          if (value === '') {
                            handleResultChange(fixture.id, 'home', '0')
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
                            
                            // If valid, update the result
                            handleResultChange(fixture.id, 'home', value)
                          }
                        }}
                        className={`score-input home-score ${validationErrors[`${fixture.id}-home`] ? 'error' : ''}`}
                        placeholder="0"
                        disabled={!isAdmin}
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
                      <div className="team-info">
                        {getTeamLogo(fixture.away_team) && (
                          <img 
                            src={`/${getTeamLogo(fixture.away_team)}`} 
                            alt={`${fixture.away_team} logo`}
                            className="team-logo"
                          />
                        )}
                        <div className="team-name">{fixture.away_team}</div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={results[fixture.id]?.away ?? 0}
                        onChange={(e) => handleResultChange(fixture.id, 'away', e.target.value)}
                        onBlur={(e) => {
                          // Validate on blur and show errors for invalid values
                          const value = e.target.value
                          if (value === '') {
                            handleResultChange(fixture.id, 'away', '0')
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
                            
                            // If valid, update the result
                            handleResultChange(fixture.id, 'away', value)
                          }
                        }}
                        className={`score-input away-score ${validationErrors[`${fixture.id}-away`] ? 'error' : ''}`}
                        placeholder="0"
                        disabled={!isAdmin}
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
      {fixtures.length > 0 && isAdmin && (
        <div className="submit-section">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? 'Submitting...' : gameweekSubmitted ? 'Override Results' : 'Submit Results'}
          </button>
          <p className="submit-hint">
            💡 Leave fields empty for 0-0 results
            {isAdmin && gameweekSubmitted && (
              <span className="admin-hint"> • Admin can override existing results</span>
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
            {isAdmin 
              ? 'Enter actual match results. Empty fields will be treated as 0-0 results. Only admins can manage results.'
              : 'View actual match results for the selected gameweek.'
            }
            {isAdmin && gameweekSubmitted && (
              <span className="admin-instruction"> Admins can override existing results.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Results 