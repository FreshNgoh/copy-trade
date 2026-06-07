'use client';

import * as React from 'react';
import { generateCandles, type Candle } from '@/lib/mock-data';

export function CandlestickChart({ pair = 'ETH/USDC' }: { pair?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [candles, setCandles] = React.useState<Candle[]>([]);
  const [width, setWidth] = React.useState(900);
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const height = 480;
  const padding = { top: 16, right: 56, bottom: 28, left: 8 };

  React.useEffect(() => {
    setCandles(generateCandles(pair, 100));
  }, [pair]);

  React.useEffect(() => {
    const onResize = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    if (!candles.length) return;
    const interval = setInterval(() => {
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const newClose = last.close * (1 + (Math.random() - 0.5) * 0.004);
        return [
          ...prev.slice(0, -1),
          { ...last, close: newClose, high: Math.max(last.high, newClose), low: Math.min(last.low, newClose) },
        ];
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [candles.length]);

  if (!candles.length) {
    return <div ref={containerRef} style={{ height }} className="w-full" />;
  }

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const range = (maxPrice - minPrice) || 1;
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const candleWidth = Math.max(2, Math.floor(chartWidth / candles.length) - 2);
  const step = chartWidth / candles.length;

  const yScale = (p: number) => padding.top + chartHeight - ((p - minPrice) / range) * chartHeight;
  const xScale = (i: number) => padding.left + i * step + step / 2;

  // Y axis ticks
  const ticks = 6;
  const tickValues = Array.from({ length: ticks }, (_, i) => minPrice + (range * i) / (ticks - 1));

  // X axis labels (every nth candle)
  const labelStep = Math.max(1, Math.floor(candles.length / 8));

  return (
    <div ref={containerRef} className="w-full relative" style={{ height }} data-testid="candlestick-chart">
      <svg width={width} height={height} className="block">
        {/* Grid */}
        {tickValues.map((v, i) => (
          <line
            key={`gy-${i}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="#1A1A1C"
            strokeDasharray="2 4"
          />
        ))}

        {/* Y axis labels */}
        {tickValues.map((v, i) => (
          <text
            key={`ty-${i}`}
            x={width - padding.right + 6}
            y={yScale(v) + 3}
            fill="#A1A1AA"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
          >
            {v < 1 ? v.toFixed(5) : v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
        ))}

        {/* X axis */}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          stroke="#27272A"
        />

        {/* Candles */}
        {candles.map((c, i) => {
          const x = xScale(i);
          const yHigh = yScale(c.high);
          const yLow = yScale(c.low);
          const yOpen = yScale(c.open);
          const yClose = yScale(c.close);
          const isUp = c.close >= c.open;
          const color = isUp ? '#10B981' : '#F43F5E';
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(1, Math.abs(yClose - yOpen));

          // X label
          const xLabel =
            i % labelStep === 0 ? (
              <text
                key={`xt-${i}`}
                x={x}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fill="#A1A1AA"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
              >
                {new Date(c.time * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </text>
            ) : null;

          return (
            <g key={`c-${i}`} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: 'crosshair' }}>
              <rect x={x - candleWidth / 2 - 1} y={padding.top} width={candleWidth + 2} height={chartHeight} fill="transparent" />
              <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
              <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyH} fill={color} />
              {xLabel}
            </g>
          );
        })}

        {/* Crosshair */}
        {hoverIdx !== null && (
          <>
            <line
              x1={xScale(hoverIdx)}
              x2={xScale(hoverIdx)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="#52525B"
              strokeDasharray="3 3"
            />
          </>
        )}
      </svg>

      {/* OHLC overlay */}
      <div className="absolute top-2 left-3 font-mono text-[11px] flex gap-3">
        {(() => {
          const c = hoverIdx !== null ? candles[hoverIdx] : candles[candles.length - 1];
          const isUp = c.close >= c.open;
          return (
            <>
              <span className="text-muted-foreground">{pair}</span>
              <span className="text-muted-foreground">O <span className="text-white">{c.open.toFixed(2)}</span></span>
              <span className="text-muted-foreground">H <span className="text-success">{c.high.toFixed(2)}</span></span>
              <span className="text-muted-foreground">L <span className="text-danger">{c.low.toFixed(2)}</span></span>
              <span className="text-muted-foreground">C <span className={isUp ? 'text-success' : 'text-danger'}>{c.close.toFixed(2)}</span></span>
              <span className="text-muted-foreground">Vol <span className="text-white">{c.volume.toLocaleString()}</span></span>
            </>
          );
        })()}
      </div>
    </div>
  );
}
