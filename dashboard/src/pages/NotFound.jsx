import { useNavigate } from 'react-router-dom';
import { Ghost, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-lg">

        {/* Animated ghost icon */}
        <div className="relative inline-block mb-8">
          <div className="absolute -inset-6 bg-blue-100/60 rounded-full blur-2xl animate-pulse" />
          <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 shadow-lg animate-bounce-slow">
            <Ghost className="w-14 h-14 text-blue-500" />
          </div>
        </div>

        {/* Error code */}
        <h1 className="text-8xl font-extrabold tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 select-none">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-slate-800 mb-3">
          Page not found
        </h2>
        <p className="text-slate-500 mb-10 leading-relaxed max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Go Back
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        {/* Decorative dots */}
        <div className="mt-16 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-150" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-300" />
        </div>
      </div>
    </div>
  );
}
