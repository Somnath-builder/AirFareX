import React from 'react';

// Using a simple conditional class joiner to avoid external dependencies in this isolated file
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface AirfareXLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function AirfareXLogo({ size = 180, className, animated = true }: AirfareXLogoProps) {
  const dashStyle = animated ? {} : { strokeDashoffset: 641 };
  const dashClass = animated ? "animate-dash" : "";

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 400 400" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <style>
        {`
          @keyframes dash-orbit {
            0% { stroke-dashoffset: 641; }
            100% { stroke-dashoffset: -359; }
          }
          .animate-dash {
            animation: dash-orbit 8s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-dash {
              animation: none;
            }
          }
        `}
      </style>
      <defs>
        {/* Glow behind the A */}
        <filter id="a-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#07111F" floodOpacity="0.8" />
        </filter>
        
        {/* Shadow cast by the front ribbon over the A */}
        <filter id="ribbon-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.6" />
        </filter>

        {/* Gradient for the A */}
        <linearGradient id="a-grad" x1="200" y1="40" x2="200" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E65B5" />
          <stop offset="1" stopColor="#0B4188" />
        </linearGradient>

        {/* Constellation/network texture inside the A */}
        <pattern id="constellation" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
          <circle cx="60" cy="30" r="2" fill="#FFFFFF" fillOpacity="0.7" />
          <circle cx="30" cy="70" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
          <circle cx="70" cy="60" r="1" fill="#FFFFFF" fillOpacity="0.4" />
          <path d="M 20 20 L 60 30 L 70 60 L 30 70 Z" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
          <path d="M 20 20 L 30 70" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
          <path d="M 60 30 L 100 20" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
          <path d="M 70 60 L 80 110" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
          <path d="M 20 20 L -20 30" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
          <path d="M 30 70 L 20 100" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
        </pattern>

        {/* The hidden mathematical path for the airplane to follow (anticlockwise: sweep-flag=0) */}
        <path id="orbit-path" d="M 20 220 A 180 60 0 0 0 380 220 A 180 60 0 0 0 20 220" />

        <g id="orbital-group">
          {/* Saffron / Orange */}
          <path 
            d="M 10 220 A 190 70 0 0 0 390 220 A 190 70 0 0 0 10 220" 
            fill="none" 
            stroke="#FF9933" 
            strokeWidth="10" 
            strokeLinecap="round" 
            pathLength="1000"
            strokeDasharray="600 400"
            className={dashClass}
            style={dashStyle}
          />
          {/* White */}
          <path 
            d="M 20 220 A 180 60 0 0 0 380 220 A 180 60 0 0 0 20 220" 
            fill="none" 
            stroke="#FFFFFF" 
            strokeWidth="10" 
            strokeLinecap="round" 
            pathLength="1000"
            strokeDasharray="600 400"
            className={dashClass}
            style={dashStyle}
          />
          {/* Green */}
          <path 
            d="M 30 220 A 170 50 0 0 0 370 220 A 170 50 0 0 0 30 220" 
            fill="none" 
            stroke="#138808" 
            strokeWidth="10" 
            strokeLinecap="round" 
            pathLength="1000"
            strokeDasharray="600 400"
            className={dashClass}
            style={dashStyle}
          />

          {/* Airplane */}
          {animated ? (
            <g>
              <animateMotion dur="8s" repeatCount="indefinite" rotate="auto">
                <mpath href="#orbit-path" />
              </animateMotion>
              <g transform="scale(1.2)">
                <path d="M 0 0 L -10 -25 L -20 -25 L -5 0 Z" fill="#E2E8F0" />
                <path d="M 0 0 L -10 25 L -20 25 L -5 0 Z" fill="#CBD5E1" />
                <path d="M -25 0 L -30 -12 L -34 -12 L -28 0 Z" fill="#E2E8F0" />
                <path d="M -25 0 L -30 12 L -34 12 L -28 0 Z" fill="#CBD5E1" />
                <path d="M -30 -4 L 15 -4 C 25 -4 35 -1 35 0 C 35 1 25 4 15 4 L -30 4 C -32 4 -34 2 -34 0 C -34 -2 -32 -4 -30 -4 Z" fill="#FFFFFF" />
                <path d="M 20 -2 L 25 -1 L 25 1 L 20 2 Z" fill="#0F172A" />
              </g>
            </g>
          ) : (
            <g transform="translate(20, 220) rotate(-90)">
              <g transform="scale(1.2)">
                <path d="M 0 0 L -10 -25 L -20 -25 L -5 0 Z" fill="#E2E8F0" />
                <path d="M 0 0 L -10 25 L -20 25 L -5 0 Z" fill="#CBD5E1" />
                <path d="M -25 0 L -30 -12 L -34 -12 L -28 0 Z" fill="#E2E8F0" />
                <path d="M -25 0 L -30 12 L -34 12 L -28 0 Z" fill="#CBD5E1" />
                <path d="M -30 -4 L 15 -4 C 25 -4 35 -1 35 0 C 35 1 25 4 15 4 L -30 4 C -32 4 -34 2 -34 0 C -34 -2 -32 -4 -30 -4 Z" fill="#FFFFFF" />
                <path d="M 20 -2 L 25 -1 L 25 1 L 20 2 Z" fill="#0F172A" />
              </g>
            </g>
          )}
        </g>

        {/* Clip paths split exactly at the horizontal axis to perfectly interleave front and back elements */}
        {/* Overlapping by 2px to eliminate any anti-aliasing seams */}
        <clipPath id="clip-back">
          <rect x="0" y="0" width="400" height="221" />
        </clipPath>
        <clipPath id="clip-front">
          <rect x="0" y="219" width="400" height="181" />
        </clipPath>
      </defs>

      {/* Background Orbit (Behind 'A') */}
      <use href="#orbital-group" clipPath="url(#clip-back)" />

      {/* Static Central 'A' */}
      <g filter="url(#a-glow)">
        <path 
          d="M 200 40 L 320 340 L 280 340 L 248 260 L 152 260 L 120 340 L 80 340 Z M 200 140 L 168 220 L 232 220 Z" 
          fill="url(#a-grad)"
          stroke="url(#a-grad)"
          strokeWidth="16"
          strokeLinejoin="round" 
          fillRule="evenodd"
        />
        <path 
          d="M 200 40 L 320 340 L 280 340 L 248 260 L 152 260 L 120 340 L 80 340 Z M 200 140 L 168 220 L 232 220 Z" 
          fill="url(#constellation)" 
          stroke="url(#constellation)"
          strokeWidth="16"
          strokeLinejoin="round" 
          fillRule="evenodd"
        />
      </g>

      {/* Foreground Orbit (In front of 'A') */}
      <use href="#orbital-group" clipPath="url(#clip-front)" filter="url(#ribbon-shadow)" />
    </svg>
  );
}
