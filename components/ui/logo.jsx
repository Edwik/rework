"use client"
export function Logo({ className = "h-8 w-auto", showText = true }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <img
          src="/assets/logo.png"
          alt="Rework Logo"
          className={`object-contain ${className}`}
          onError={(e) => {
            console.error('Error loading logo:', e);
            // Mostrar un fallback simple
            e.target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = `flex items-center justify-center bg-blue-600 text-white font-bold rounded text-sm ${className}`;
            fallback.textContent = 'R';
            e.target.parentNode.appendChild(fallback);
          }}
          onLoad={() => {
            console.log('Logo loaded successfully');
          }}
        />
      </div>
      {showText && (
        <span className="text-lg font-semibold text-gray-900">Rework</span>
      )}
    </div>
  )
}

export default Logo