const API_BASE_URL = 'http://localhost:8000'

const api = {
  // Authentication functions
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error logging in:', error)
      throw error
    }
  },

  async register(email, password, username) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error registering:', error)
      throw error
    }
  },

  async validateSession(token) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch(`${API_BASE_URL}/auth/validate?token=${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('401 Unauthorized')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error validating session:', error)
      // Don't throw on network errors, let the app handle it gracefully
      if (error.message.includes('401')) {
        throw error
      }
      return { valid: false, user: null }
    }
  },

  async logout() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error logging out:', error)
      throw error
    }
  },

  // Existing API functions
  async getFixtures(gameweek = null) {
    try {
      const url = gameweek 
        ? `${API_BASE_URL}/fixtures/?gameweek=${gameweek}`
        : `${API_BASE_URL}/fixtures/`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching fixtures:', error)
      throw error
    }
  },

  async getPredictions(userId = null, gameweek = null, token = null) {
    try {
      let url = userId 
        ? `${API_BASE_URL}/predictions/?user_id=${userId}`
        : `${API_BASE_URL}/predictions/`
      
      if (gameweek) {
        url += userId ? '&' : '?' 
        url += `gameweek=${gameweek}`
      }

      // Add token for authentication
      if (token) {
        url += userId || gameweek ? '&' : '?'
        url += `token=${token}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching predictions:', error)
      return { predictions: [] }
    }
  },

  async submitPrediction(prediction, token = null) {
    try {
      let url = `${API_BASE_URL}/predictions/`
      
      // Add token for authentication
      if (token) {
        url += `?token=${token}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prediction),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error submitting prediction:', error)
      throw error
    }
  },

  async deletePrediction(predictionId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/predictions/${predictionId}?token=${token}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error deleting prediction:', error)
      throw error
    }
  },

  async updatePrediction(predictionId, predictionUpdate, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/predictions/${predictionId}?token=${token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionUpdate),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error updating prediction:', error)
      throw error
    }
  },

  async getLeaderboard() {
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard/`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      // Return empty leaderboard instead of throwing
      return { leaderboard: [] }
    }
  },

  async getResults(gameweek = null, token = null) {
    try {
      let url = `${API_BASE_URL}/results/`
      
      if (gameweek) {
        url += `?gameweek=${gameweek}`
      }

      // Add token for authentication
      if (token) {
        url += gameweek ? '&' : '?'
        url += `token=${token}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching results:', error)
      return { results: [] }
    }
  },

  async submitResult(result, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/results/?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error submitting result:', error)
      throw error
    }
  },

  async deleteResult(resultId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/results/${resultId}?token=${token}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error deleting result:', error)
      throw error
    }
  },

  async updateResult(resultId, resultUpdate, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/results/${resultId}?token=${token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resultUpdate),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error updating result:', error)
      throw error
    }
  }
}

export default api 