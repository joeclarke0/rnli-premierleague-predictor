import { useState, useEffect } from 'react'
import api from '../services/api'
import sessionManager from '../utils/session'

const Admin = ({ currentUser }) => {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userPredictions, setUserPredictions] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [selectedGameweek, setSelectedGameweek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
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
      'Crystal Palace': 'Palace logo.svg',
      'Everton': 'Everton logo.svg',
      'Fulham': 'Fulham logo.svg',
      'Leeds United': 'Leeds logo.svg',
      'Liverpool': 'liverpool logo.jpeg',
      'Manchester City': 'mancity logo.svg',
      'Manchester United': 'united logo.svg',
      'Newcastle United': 'Newcastle logo.svg',
      'Nottingham Forest': 'forrest logo.png',
      'Sunderland': 'sunderland logo.svg',
      'Tottenham Hotspur': 'spurs logo.jpeg',
      'West Ham United': 'hammers logo.svg',
      'Wolverhampton Wanderers': 'Wolves logo.svg'
    }
    return logoMap[teamName] || null
  }

  useEffect(() => {
    loadUsers()
    loadFixtures()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      loadUserPredictions(selectedUser.id)
    }
  }, [selectedUser, selectedGameweek])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const token = sessionManager.getToken()
      const response = await api.getUsers(token)
      setUsers(response.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setMessage('Error loading users')
    } finally {
      setLoading(false)
    }
  }

  const loadFixtures = async () => {
    try {
      const response = await api.getFixtures(selectedGameweek)
      setFixtures(response.fixtures || [])
    } catch (error) {
      console.error('Error loading fixtures:', error)
      setMessage('Error loading fixtures')
    }
  }

  const loadUserPredictions = async (userId) => {
    try {
      const token = sessionManager.getToken()
      const response = await api.getPredictions(userId, selectedGameweek, token)
      const predictions = {}
      
      response.predictions?.forEach(pred => {
        if (pred.gameweek === selectedGameweek) {
          predictions[pred.fixture_id] = {
            id: pred.id,
            home: pred.predicted_home,
            away: pred.predicted_away
          }
        }
      })
      
      setUserPredictions(predictions)
    } catch (error) {
      console.error('Error loading user predictions:', error)
      setMessage('Error loading user predictions')
    }
  }

  const handlePredictionChange = (fixtureId, field, value) => {
    setValidationErrors(prev => ({
      ...prev,
      [`${fixtureId}-${field}`]: null
    }))
    
    let validatedValue = 0
    
    if (value === '') {
      validatedValue = 0
    } else {
      if (!/^\d+$/.test(value)) {
        setValidationErrors(prev => ({
          ...prev,
          [`${fixtureId}-${field}`]: 'Enter value between 0-100'
        }))
        return
      }
      
      const numValue = parseInt(value)
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        validatedValue = numValue
      } else {
        setValidationErrors(prev => ({
          ...prev,
          [`${fixtureId}-${field}`]: 'Enter value between 0-100'
        }))
        return
      }
    }
    
    setUserPredictions(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: validatedValue
      }
    }))
  }

  const handleSubmitPrediction = async (fixtureId) => {
    if (!selectedUser) return
    
    const prediction = userPredictions[fixtureId]
    if (!prediction) return
    
    try {
      setSubmitting(true)
      const token = sessionManager.getToken()
      
      if (prediction.id) {
        // Update existing prediction
        await api.updatePrediction(prediction.id, {
          predicted_home: prediction.home,
          predicted_away: prediction.away
        }, token)
      } else {
        // Create new prediction
        await api.submitPrediction({
          user_id: selectedUser.id,
          gameweek: selectedGameweek,
          fixture_id: fixtureId,
          predicted_home: prediction.home,
          predicted_away: prediction.away
        }, token)
      }
      
      setMessage('✅ Prediction updated successfully')
      setTimeout(() => setMessage(''), 3000)
      
      // Reload predictions to get updated IDs
      loadUserPredictions(selectedUser.id)
    } catch (error) {
      console.error('Error updating prediction:', error)
      setMessage('Error updating prediction')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePrediction = async (predictionId) => {
    if (!predictionId) return
    
    try {
      setSubmitting(true)
      const token = sessionManager.getToken()
      await api.deletePrediction(predictionId, token)
      
      setMessage('✅ Prediction deleted successfully')
      setTimeout(() => setMessage(''), 3000)
      
      loadUserPredictions(selectedUser.id)
    } catch (error) {
      console.error('Error deleting prediction:', error)
      setMessage('Error deleting prediction')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (timeString) => {
    return timeString
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    )
  }

  return (
    <div className="predictions-container">
      <div className="predictions-header">
        <div className="header-content">
          <h1 className="page-title">🔧 Admin Panel</h1>
          <p className="page-subtitle">Manage users and their predictions</p>
        </div>
      </div>

      {message && (
        <div className={`status-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="admin-grid">
        {/* Users List */}
        <div className="users-section">
          <div className="users-header">
            <h2>👥 Users ({users.length})</h2>
            <div className="users-search">
              <input
                type="text"
                placeholder="Search users..."
                className="search-input"
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase()
                  const filteredUsers = users.filter(user => 
                    user.username.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm)
                  )
                  // For now, just log the filtered users
                  console.log('Filtered users:', filteredUsers)
                }}
              />
            </div>
          </div>
          <div className="users-list">
            {users.map(user => (
              <div 
                key={user.id} 
                className={`user-card ${selectedUser?.id === user.id ? 'selected' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="user-info">
                  <div className="user-main">
                    <span className="user-name">{user.username}</span>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? '🔧' : '👤'}
                    </span>
                  </div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Predictions */}
        {selectedUser && (
          <div className="predictions-section">
            <div className="predictions-header">
              <h2>🎯 {selectedUser.username}'s Predictions</h2>
              <div className="gameweek-selector">
                <label className="selector-label">Gameweek:</label>
                <select 
                  className="gameweek-select"
                  value={selectedGameweek}
                  onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
                >
                  {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                    <option key={gw} value={gw}>Gameweek {gw}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="fixtures-section">
              <div className="fixtures-grid">
                {fixtures.map(fixture => {
                  const prediction = userPredictions[fixture.id]
                  const hasPrediction = prediction && (prediction.home > 0 || prediction.away > 0)
                  
                  return (
                    <div key={fixture.id} className="fixture-card">
                      <div className="fixture-header">
                        <div className="match-info">
                          <div className="match-date">{formatDate(fixture.date)}</div>
                          <div className="match-time">{formatTime(fixture.time)}</div>
                        </div>
                        {hasPrediction && (
                          <div className="prediction-status">
                            <span className="status-badge entered">Entered</span>
                          </div>
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
                            value={prediction?.home || ''}
                            onChange={(e) => handlePredictionChange(fixture.id, 'home', e.target.value)}
                            className={`score-input home-score ${validationErrors[`${fixture.id}-home`] ? 'error' : ''}`}
                            placeholder="0"
                          />
                        </div>

                        <div className="score-divider">
                          <div className="vs-text">vs</div>
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
                            value={prediction?.away || ''}
                            onChange={(e) => handlePredictionChange(fixture.id, 'away', e.target.value)}
                            className={`score-input away-score ${validationErrors[`${fixture.id}-away`] ? 'error' : ''}`}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {validationErrors[`${fixture.id}-home`] && (
                        <div className="validation-error">{validationErrors[`${fixture.id}-home`]}</div>
                      )}
                      {validationErrors[`${fixture.id}-away`] && (
                        <div className="validation-error">{validationErrors[`${fixture.id}-away`]}</div>
                      )}

                      <div className="submit-section">
                        <button
                          onClick={() => handleSubmitPrediction(fixture.id)}
                          disabled={submitting}
                          className="submit-btn"
                        >
                          {submitting ? 'Saving...' : 'Override Prediction'}
                        </button>
                        
                        {prediction?.id && (
                          <button
                            onClick={() => handleDeletePrediction(prediction.id)}
                            disabled={submitting}
                            className="delete-btn"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin 