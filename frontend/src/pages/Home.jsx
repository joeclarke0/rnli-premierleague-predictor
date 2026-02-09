import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-rnli-blue to-rnli-blue-light text-white rounded-lg shadow-xl p-12 text-center">
        <h1 className="text-5xl font-bold mb-4">⚓ RNLI Premier League Predictor</h1>
        <p className="text-xl mb-8">Predict. Compete. Support the RNLI.</p>
        <div className="flex justify-center gap-4">
          {isAuthenticated() ? (
            <>
              <Link to="/predictions" className="btn-secondary text-lg px-8 py-3">
                Make Predictions
              </Link>
              <Link to="/leaderboard" className="bg-white text-rnli-blue hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors duration-200 text-lg">
                View Leaderboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-secondary text-lg px-8 py-3">
                Get Started
              </Link>
              <Link to="/login" className="bg-white text-rnli-blue hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors duration-200 text-lg">
                Login
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="card text-center">
          <div className="text-4xl mb-4">⚽</div>
          <h3 className="text-xl font-bold mb-2 text-rnli-blue">Make Your Predictions</h3>
          <p className="text-gray-600">
            Predict scores for all 380 Premier League fixtures across 38 gameweeks.
          </p>
        </div>

        <div className="card text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-xl font-bold mb-2 text-rnli-blue">Earn Points</h3>
          <p className="text-gray-600">
            5 points for exact scores, 2 points for correct results. Compete for the top spot!
          </p>
        </div>

        <div className="card text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2 text-rnli-blue">Track Progress</h3>
          <p className="text-gray-600">
            Follow your performance on the leaderboard and see how you stack up.
          </p>
        </div>
      </div>

      {/* Scoring System */}
      <div className="card bg-rnli-yellow bg-opacity-10">
        <h2 className="text-2xl font-bold mb-4 text-rnli-blue">Scoring System</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">5 Points</div>
            <p className="font-semibold">Exact Score</p>
            <p className="text-sm text-gray-600">Predict both home and away scores correctly</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">2 Points</div>
            <p className="font-semibold">Correct Result</p>
            <p className="text-sm text-gray-600">Predict the winner or draw correctly</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-600 mb-2">0 Points</div>
            <p className="font-semibold">Incorrect</p>
            <p className="text-sm text-gray-600">Wrong prediction</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!isAuthenticated() && (
        <div className="card bg-rnli-blue text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Join the Competition Today!</h2>
          <p className="mb-6 text-lg">
            Compete with your colleagues and support the RNLI.
          </p>
          <Link to="/register" className="btn-secondary text-lg px-8 py-3">
            Sign Up Now
          </Link>
        </div>
      )}
    </div>
  );
}
