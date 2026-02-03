// src/pages/NotFound.jsx
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="text-9xl font-bold text-purple-600 mb-4">404</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 text-lg">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        <div className="mt-12 text-gray-500">
          <p className="text-sm">Need help? Try these popular pages:</p>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <Link to="/players" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              Players
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/teams" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              Teams
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/rankings" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              Rankings
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/analytics" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFound;