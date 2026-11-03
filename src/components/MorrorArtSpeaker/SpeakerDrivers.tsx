import React from 'react';

interface SpeakerDriversProps {
  bassIntensity: number; // 0..1 from real-time audio analysis
  excursionMultiplier?: number; // 0..2 user adjustable
}

/**
 * SpeakerDrivers implements the authentic MORROR ART A2 / MorningBlues SonicGlass A1
 * "Hollow Ring Speakers" (中空透明悬浮环):
 * 1. Circular ring structure with matte black stepped concentric bevels & fine specular chamfers
 * 2. 100% transparent hollow center aperture allowing lyrics & visuals to be seen directly through it
 * 3. Horizontal thick matte black mounting arms anchored at 9 o'clock (left wall) and 3 o'clock (right wall)
 * 4. Realistic spatial drop-shadow cast onto the recessed backboard shifted down-right (+15px, +15px)
 * 5. Dynamic bass cone micro-pulsing synchronized to real-time audio
 */
export const SpeakerDrivers: React.FC<SpeakerDriversProps> = ({
  bassIntensity,
  excursionMultiplier = 1.0,
}) => {
  // Compute driver excursion (physical vibration)
  const excursion = Math.min(1, bassIntensity * excursionMultiplier);
  const ringScale = 1 + excursion * 0.04;
  const shadowShiftX = 15 + excursion * 3;
  const shadowShiftY = 15 + excursion * 3;
  const shadowBlur = 18 + excursion * 6;
  const shadowAlpha = 0.42 + excursion * 0.08;

  // Single Hollow Ring Transducer Assembly with 100% Transparent Optical Center
  const renderHollowSpeakerRing = () => (
    <div
      className="relative rounded-full flex items-center justify-center transition-transform duration-75 ease-out select-none"
      style={{
        width: 'clamp(140px, 22cqw, 350px)',
        height: 'clamp(140px, 22cqw, 350px)',
        transform: `scale(${ringScale})`,
      }}
    >
      {/* ---------------- 1. OUTER STEPPED MATTE BLACK BEZEL (外圈哑光黑立体阶梯圆环) ---------------- */}
      <div
        className="relative w-full h-full rounded-full p-[3.8%] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),inset_0_-3px_6px_rgba(0,0,0,0.95)]"
        style={{
          background:
            'radial-gradient(circle at 35% 25%, #20242b 0%, #15181d 45%, #0e1013 85%, #07080a 100%)',
          border: '1.4px solid #2e343e',
        }}
      >
        {/* Specular Metallic Chamfer Highlight (Top-Left arc ~10:30) */}
        <div
          className="absolute -top-[1px] -left-[1px] w-[50%] h-[50%] rounded-tl-full pointer-events-none opacity-85"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.25) 20%, transparent 60%)',
            maskImage:
              'radial-gradient(circle at 50% 50%, transparent 68%, black 72%, black 98%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(circle at 50% 50%, transparent 68%, black 72%, black 98%, transparent 100%)',
          }}
        />

        {/* Specular Metallic Chamfer Highlight (Bottom-Right arc ~4:30) */}
        <div
          className="absolute -bottom-[1px] -right-[1px] w-[50%] h-[50%] rounded-br-full pointer-events-none opacity-70"
          style={{
            background:
              'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 25%, transparent 65%)',
            maskImage:
              'radial-gradient(circle at 50% 50%, transparent 68%, black 72%, black 98%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(circle at 50% 50%, transparent 68%, black 72%, black 98%, transparent 100%)',
          }}
        />

        {/* ---------------- 2. RECESSED CONCENTRIC STEP GROOVE (阶梯过渡内凹槽) ---------------- */}
        <div className="w-full h-full rounded-full p-[4%] bg-[#08090b] shadow-[inset_0_3px_8px_rgba(0,0,0,0.98)] flex items-center justify-center border border-[#1d2128]">
          {/* ---------------- 3. CONVEX VULCANIZED RUBBER ROLL SURROUND (橡胶折环悬边) ---------------- */}
          <div
            className="relative w-full h-full rounded-full p-[6.5%] flex items-center justify-center shadow-[inset_0_3px_10px_rgba(0,0,0,0.95)]"
            style={{
              background:
                'radial-gradient(circle at 45% 45%, #191c21 0%, #101216 55%, #08090b 100%)',
              border: '1.2px solid #1a1e24',
            }}
          >
            {/* Circular highlight crest on rubber roll */}
            <div
              className="absolute inset-[5%] rounded-full pointer-events-none opacity-35"
              style={{
                boxShadow:
                  'inset 0 1.5px 2px rgba(255, 255, 255, 0.45), inset 0 -2px 3px rgba(0, 0, 0, 0.95)',
              }}
            />

            {/* ---------------- 4. INNER METALLIC BEZEL (精细高光金属倒角内环) ---------------- */}
            <div
              className="relative w-full h-full rounded-full p-[4.5%] flex items-center justify-center border border-[#3b4350]"
              style={{
                background:
                  'radial-gradient(circle at 35% 35%, #2a303a 0%, #16191e 60%, #0c0e11 100%)',
                boxShadow:
                  'inset 0 2px 5px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.95)',
              }}
            >
              {/* Inner Chamfer Bevel Ring */}
              <div className="w-full h-full rounded-full p-[3%] bg-[#0a0c0e] shadow-inner flex items-center justify-center border border-[#252a33]">
                {/* ---------------- 5. 100% HOLLOW TRANSPARENT APERTURE (完全透明穿透中空圆孔) ---------------- */}
                {/* Crucial requirement: Center must be 100% transparent to see background and lyrics through it */}
                <div
                  className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1.4px solid rgba(255, 255, 255, 0.42)',
                    boxShadow:
                      'inset 0 1.5px 3px rgba(255, 255, 255, 0.55), inset 0 -1.5px 3px rgba(0, 0, 0, 0.65), 0 0 1px rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {/* Glass Perimeter Internal Refraction Arc (Low-iron cyan tint catch) */}
                  <div className="absolute inset-0 rounded-full border border-sky-300/20 pointer-events-none" />

                  {/* Subtle Glass Curvature Glint Arc (Top-Left) */}
                  <div
                    className="absolute -top-[10%] -left-[10%] w-[65%] h-[65%] rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.08) 25%, transparent 65%)',
                      transform: 'rotate(-30deg)',
                    }}
                  />

                  {/* Faint Glass Curvature Glint Arc (Bottom-Right bounce) */}
                  <div
                    className="absolute -bottom-[12%] -right-[12%] w-[50%] h-[50%] rounded-full pointer-events-none opacity-30"
                    style={{
                      background:
                        'radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.35) 0%, transparent 60%)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* ----------------- 1. UPPER-LEFT HOLLOW SPEAKER + 9 O'CLOCK BRACKET ----------------- */}
      <div
        className="absolute top-[13%] left-0 flex items-center"
        style={{
          transform: 'translateZ(38px)',
          transformStyle: 'preserve-3d',
          // Directional drop-shadow shifted down-right (+15px, +15px) onto the recessed backboard
          filter: `drop-shadow(${shadowShiftX}px ${shadowShiftY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha}))`,
        }}
      >
        {/* Physical 9 o'clock Mounting Bracket: Short, thick black metal horizontal arm */}
        <div
          className="relative flex items-center justify-end"
          style={{
            width: 'clamp(32px, 5.2cqw, 88px)',
            height: 'clamp(26px, 3.8cqw, 62px)',
            background:
              'linear-gradient(180deg, #252a32 0%, #16191e 30%, #0d0f12 70%, #060709 100%)',
            borderTop: '1.2px solid #3c4452',
            borderBottom: '1.2px solid #080a0c',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25)',
          }}
        >
          {/* Wall socket joint collar */}
          <div
            className="absolute left-0 inset-y-0 bg-[#121417] border-r border-[#303742]"
            style={{ width: 'clamp(6px, 0.9cqw, 14px)' }}
          />

          {/* Precision machined horizontal detail groove */}
          <div className="w-full h-[2px] bg-[#090a0c] border-b border-white/10" />

          {/* Transducer mounting hinge plate */}
          <div
            className="absolute right-0 inset-y-1 bg-[#1a1d22] border-l border-[#353c48] rounded-l-sm"
            style={{ width: 'clamp(5px, 0.7cqw, 11px)' }}
          />
        </div>

        {/* Hollow Ring Speaker */}
        {renderHollowSpeakerRing()}
      </div>

      {/* ----------------- 2. LOWER-RIGHT HOLLOW SPEAKER + 3 O'CLOCK BRACKET ----------------- */}
      <div
        className="absolute bottom-[13%] right-0 flex items-center justify-end"
        style={{
          transform: 'translateZ(38px)',
          transformStyle: 'preserve-3d',
          // Directional drop-shadow shifted down-right (+15px, +15px) onto the recessed backboard
          filter: `drop-shadow(${shadowShiftX}px ${shadowShiftY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha}))`,
        }}
      >
        {/* Hollow Ring Speaker */}
        {renderHollowSpeakerRing()}

        {/* Physical 3 o'clock Mounting Bracket: Short, thick black metal horizontal arm */}
        <div
          className="relative flex items-center justify-start"
          style={{
            width: 'clamp(32px, 5.2cqw, 88px)',
            height: 'clamp(26px, 3.8cqw, 62px)',
            background:
              'linear-gradient(180deg, #252a32 0%, #16191e 30%, #0d0f12 70%, #060709 100%)',
            borderTop: '1.2px solid #3c4452',
            borderBottom: '1.2px solid #080a0c',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25)',
          }}
        >
          {/* Transducer mounting hinge plate */}
          <div
            className="absolute left-0 inset-y-1 bg-[#1a1d22] border-r border-[#353c48] rounded-r-sm"
            style={{ width: 'clamp(5px, 0.7cqw, 11px)' }}
          />

          {/* Precision machined horizontal detail groove */}
          <div className="w-full h-[2px] bg-[#090a0c] border-b border-white/10" />

          {/* Wall socket joint collar */}
          <div
            className="absolute right-0 inset-y-0 bg-[#121417] border-l border-[#303742]"
            style={{ width: 'clamp(6px, 0.9cqw, 14px)' }}
          />
        </div>
      </div>
    </div>
  );
};
