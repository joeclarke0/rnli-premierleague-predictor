// Session management utilities
const SESSION_KEY = 'rnli_session'
const TOKEN_KEY = 'rnli_token'

export const sessionManager = {
  // Save session data
  saveSession(sessionData) {
    try {
      console.log('💾 Saving session for user:', sessionData.user?.username)
      const session = {
        user: sessionData.user,
        token: sessionData.token,
        expiresAt: sessionData.expires_at,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      localStorage.setItem(TOKEN_KEY, sessionData.token)
      console.log('✅ Session saved successfully')
    } catch (error) {
      console.error('❌ Error saving session:', error)
    }
  },

  // Get current session
  getSession() {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY)
      if (!sessionStr) {
        console.log('📭 No session found in localStorage')
        return null
      }

      const session = JSON.parse(sessionStr)
      console.log('📋 Session found for user:', session.user?.username)
      
      // Check if session has expired
      if (session.expiresAt) {
        const now = new Date()
        const expiresAt = new Date(session.expiresAt)
        
        if (now > expiresAt) {
          console.log('⏰ Session expired, clearing...')
          this.clearSession()
          return null
        } else {
          console.log('✅ Session is valid, expires at:', expiresAt.toISOString())
        }
      }

      return session
    } catch (error) {
      console.error('❌ Error getting session:', error)
      return null
    }
  },

  // Get current user
  getCurrentUser() {
    const session = this.getSession()
    return session ? session.user : null
  },

  // Get current token
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  // Check if user is logged in
  isLoggedIn() {
    const session = this.getSession()
    return session !== null
  },

  // Clear session
  clearSession() {
    try {
      console.log('🗑️ Clearing session...')
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(TOKEN_KEY)
      console.log('✅ Session cleared')
    } catch (error) {
      console.error('❌ Error clearing session:', error)
    }
  },

  // Check if session is about to expire (within 1 hour)
  isSessionExpiringSoon() {
    const session = this.getSession()
    if (!session || !session.expiresAt) return false

    const now = new Date()
    const expiresAt = new Date(session.expiresAt)
    const oneHour = 60 * 60 * 1000 // 1 hour in milliseconds

    return (expiresAt - now) < oneHour
  },

  // Refresh session (extend by 24 hours)
  refreshSession() {
    const session = this.getSession()
    if (!session) return false

    try {
      const newExpiresAt = new Date()
      newExpiresAt.setHours(newExpiresAt.getHours() + 24)

      const updatedSession = {
        ...session,
        expiresAt: newExpiresAt.toISOString()
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession))
      return true
    } catch (error) {
      console.error('Error refreshing session:', error)
      return false
    }
  }
}

export default sessionManager 