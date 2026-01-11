export function DentalKPILogo({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 60"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Ícone do dente com gráfico e seta */}
      <g>
        {/* Dente - forma base */}
        <path
          d="M15 25 Q15 15, 20 10 Q25 5, 30 8 Q35 10, 38 15 Q40 20, 38 25 Q36 30, 32 32 Q28 34, 25 35 Q22 36, 20 35 Q18 34, 15 30 Z"
          fill="url(#toothGradient)"
          stroke="white"
          strokeWidth="0.5"
        />
        
        {/* Folha decorativa no topo */}
        <path
          d="M18 12 Q20 10, 22 12 Q20 14, 18 12"
          fill="#4ade80"
          opacity="0.6"
        />
        
        {/* Gráfico de barras dentro do dente */}
        <rect x="22" y="22" width="3" height="6" fill="#10b981" />
        <rect x="26" y="20" width="3" height="8" fill="#059669" />
        <rect x="30" y="18" width="3" height="10" fill="#047857" />
        
        {/* Seta crescente sobre o gráfico */}
        <path
          d="M20 24 Q25 20, 32 18 Q35 16, 38 18"
          stroke="#10b981"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M36 17 L38 18 L36 19"
          stroke="#10b981"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* Texto "Dental" */}
      <text
        x="50"
        y="25"
        fontSize="18"
        fontWeight="600"
        fill="#047857"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Dental
      </text>
      
      {/* Caixa com "KPI" */}
      <rect
        x="100"
        y="12"
        width="45"
        height="26"
        rx="6"
        fill="#047857"
      />
      <text
        x="122"
        y="30"
        fontSize="16"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        KPI
      </text>
      
      {/* Gradiente para o dente */}
      <defs>
        <linearGradient id="toothGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
    </svg>
  )
}

