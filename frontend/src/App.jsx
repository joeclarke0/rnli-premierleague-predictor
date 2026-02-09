import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Fixtures from "./pages/Fixtures";
import Predictions from "./pages/Predictions";
import Results from "./pages/Results";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/leaderboard" element={<Leaderboard />} />

            {/* Protected Routes - Require Authentication */}
            <Route
              path="/predictions"
              element={
                <ProtectedRoute>
                  <Predictions />
                </ProtectedRoute>
              }
            />

            {/* Admin Only Routes */}
            <Route
              path="/results"
              element={
                <ProtectedRoute requireAdmin>
                  <Results />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
