import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: 'oklch(0.09 0.015 264)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Letra G estilizada con el purple de GamingArena */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexágono de fondo */}
          <path
            d="M11 1L20.5 6.5V15.5L11 21L1.5 15.5V6.5L11 1Z"
            fill="oklch(0.58 0.22 263)"
            opacity="0.2"
          />
          {/* Letra G */}
          <text
            x="11"
            y="15.5"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
            fill="oklch(0.58 0.22 263)"
            letterSpacing="-0.5"
          >
            G
          </text>
        </svg>
      </div>
    ),
    { ...size },
  );
}
