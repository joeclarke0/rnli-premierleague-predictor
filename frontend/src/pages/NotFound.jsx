import { Link } from 'react-router-dom';
import { FiHome, FiCalendar } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-8xl mb-6">⚓</div>
      <h1 className="text-6xl font-black text-rnli-blue mb-2">404</h1>
      <h2 className="text-2xl font-bold text-gray-700 mb-3">Page Not Found</h2>
      <p className="text-gray-500 max-w-sm mb-10">
        Looks like this page drifted out to sea. Let's get you back to shore.
      </p>
      <div className="flex gap-4">
        <Link to="/" className="btn-primary flex items-center gap-2">
          <FiHome className="w-4 h-4" />
          Go Home
        </Link>
        <Link to="/fixtures" className="btn-secondary flex items-center gap-2">
          <FiCalendar className="w-4 h-4" />
          View Fixtures
        </Link>
      </div>
    </div>
  );
}
