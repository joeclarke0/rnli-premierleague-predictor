import { Link } from 'react-router-dom'

const Home = ({ currentUser }) => {
  const isAdmin = currentUser && currentUser.role === 'admin'

  return (
    <div className="text-center">
      <div className="card p-8 mb-8">
        <div className="mb-6">
          <div style={{ marginBottom: '1rem' }}>
            <img 
              src="/premXrnli.png" 
              alt="RNLI Premier League Predictor" 
              style={{ 
                maxWidth: '300px', 
                height: 'auto',
                margin: '0 auto',
                display: 'block'
              }} 
            />
          </div>
          <h1>Welcome to RNLI Premier League Predictor</h1>
          <p className="text-lg">
            Predict Premier League results and compete with your colleagues in this exciting prediction game!
          </p>
        </div>
      </div>

      {currentUser ? (
        // Show action buttons for logged-in users
        <div className="grid-3">
          <div className="card p-6">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
            <h3>Make Predictions</h3>
            <p className="mb-4">
              Submit your predictions for each gameweek and see how you stack up against the competition.
            </p>
            <Link to="/predictions" className="btn-primary">
              Start Predicting
            </Link>
          </div>

          <div className="card p-6">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
            <h3>View Leaderboard</h3>
            <p className="mb-4">
              Check the current standings and see who's leading the pack in our prediction league.
            </p>
            <Link to="/leaderboard" className="btn-primary">
              View Leaderboard
            </Link>
          </div>

          {/* Only show Results card for admin users */}
          {isAdmin && (
            <div className="card p-6">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3>Match Results</h3>
              <p className="mb-4">
                Admins can enter actual match results to calculate scores and update the leaderboard.
              </p>
              <Link to="/results" className="btn-secondary">
                Enter Results
              </Link>
            </div>
          )}
        </div>
      ) : (
        // Show login prompt for non-logged-in users
        <div className="card p-8 mb-8">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h2>Get Started</h2>
          <p className="text-lg mb-6">
            To access predictions, leaderboard, and results, please log in to your account.
          </p>
          <Link to="/login" className="btn-primary">
            Login to Continue
          </Link>
        </div>
      )}

      <div className="card p-6 mt-8">
        <h2>How It Works</h2>
        <div className="grid-2 mt-4">
          <div>
            <h4>1. Make Predictions</h4>
            <p>Select a gameweek and predict the scores for each match. You can leave fields empty for 0-0 predictions.</p>
          </div>
          <div>
            <h4>2. Submit Results</h4>
            <p>Admins enter the actual match results to calculate points and update the leaderboard.</p>
          </div>
          <div>
            <h4>3. Score Points</h4>
            <p>Earn points for correct predictions: 5 points for exact score, 2 points for correct result.</p>
          </div>
          <div>
            <h4>4. Compete</h4>
            <p>Track your progress on the leaderboard and compete with colleagues throughout the season.</p>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-8">
        <h2>Meet The App Creator</h2>
        <div className="mt-4">
          <img 
            src="/leadDE.jpeg" 
            alt="App Creator" 
            style={{ 
              maxWidth: '200px', 
              height: 'auto',
              margin: '0 auto',
              display: 'block',
              borderRadius: '8px'
            }} 
          />
        </div>
      </div>
    </div>
  )
}

export default Home 