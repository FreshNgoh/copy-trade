"use client";

import * as React from "react";
import { normalizeTradingViewSymbol } from "@/lib/binance";

const SCRIPT_ID = "tradingview-widget-script";
const SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

export function CandlestickChart({ pair = "BTC/USDC" }: { pair?: string }) {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const widgetRef = React.useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const tvSymbol = React.useMemo(
    () => normalizeTradingViewSymbol(pair),
    [pair],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).TradingView) {
      setIsScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsScriptLoaded(true), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => setError("Unable to load TradingView library."),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => setError("Unable to load TradingView library.");
    document.head.appendChild(script);
  }, []);

  React.useEffect(() => {
    if (!isScriptLoaded || !chartContainerRef.current) return;
    if (!(window as any).TradingView) {
      setError("TradingView is not available after loading the script.");
      return;
    }

    const container = chartContainerRef.current;
    const containerId = container.id || "tradingview-chart";
    container.id = containerId;

    if (widgetRef.current?.remove) {
      try {
        widgetRef.current.remove();
      } catch (err) {
        console.warn("TradingView widget cleanup failed during update:", err);
      }
    }

    try {
      widgetRef.current = new (window as any).TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0f172a",
        allow_symbol_change: false,
        save_image: false,
        hideideas: true,
        details: false,
        container_id: containerId,
      });
    } catch (err) {
      console.error("TradingView widget initialization failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initialize TradingView chart.",
      );
    }

    return () => {
      if (widgetRef.current?.remove) {
        try {
          widgetRef.current.remove();
        } catch (err) {
          console.warn("TradingView widget cleanup failed on unmount:", err);
        }
      }
      widgetRef.current = null;
    };
  }, [isScriptLoaded, tvSymbol]);

  return (
    <div className="relative w-full h-full bg-surface">
      <div
        id="tradingview-chart"
        ref={chartContainerRef}
        className="w-full h-full"
      />
      {!isScriptLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">
          Loading TradingView chart...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 text-sm text-danger p-4 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
