import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import sessionManager from '../utils/session'

const Login = ({ setCurrentUser }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password')
      return
    }

    if (isRegistering && !username.trim()) {
      setError('Please enter a username')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let response
      
      if (isRegistering) {
        response = await api.register(email.trim(), password, username.trim())
      } else {
        response = await api.login(email.trim(), password)
      }

      // Save session
      sessionManager.saveSession(response)
      
      // Update app state
      setCurrentUser(response.user)
      
      // Navigate to home
      navigate('/')
      
    } catch (error) {
      console.error('Authentication error:', error)
      
      if (error.message.includes('401')) {
        setError('Invalid email or password')
      } else if (error.message.includes('409')) {
        setError('User already exists. Please login instead.')
      } else if (error.message.includes('500')) {
        setError('Server error. Please try again.')
      } else {
        setError('Authentication failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
    setError('')
    setEmail('')
    setPassword('')
    setUsername('')
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div className="card p-8">
        <div className="text-center mb-6">
          <div style={{ marginBottom: '1rem' }}>
            <img 
              src="/premXrnli.png" 
              alt="Premier League x RNLI" 
              style={{ 
                width: '120px', 
                height: 'auto',
                maxWidth: '100%'
              }} 
            />
          </div>
          <h1>{isRegistering ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-lg">
            {isRegistering 
              ? 'Join the RNLI prediction league' 
              : 'Sign in to your account'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="mb-4">
              <label htmlFor="username" className="block mb-2 font-medium">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block mb-2 font-medium">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading 
              ? (isRegistering ? 'Creating Account...' : 'Signing In...') 
              : (isRegistering ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        <div className="text-center mt-6" style={{ paddingTop: '2rem' }}>
          <button
            onClick={toggleMode}
            className="btn-secondary"
            disabled={isLoading}
          >
            {isRegistering 
              ? 'Already have an account? Sign In' 
              : 'Need an account? Register'
            }
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm">
            {isRegistering 
              ? 'Your account will be created securely with Supabase'
              : 'Sign in with your registered email and password'
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login 