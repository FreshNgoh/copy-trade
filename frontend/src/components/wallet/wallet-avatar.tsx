"use client";

import * as React from "react";
import jazzicon from "@metamask/jazzicon";

export function WalletAvatar({
  address,
  size = 40,
  className = "",
}: {
  address: string;
  size?: number;
  className?: string;
}) {
  const avatarRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = avatarRef.current;
    if (!container) return;

    container.replaceChildren(jazzicon(size, getJazziconSeed(address)));
  }, [address, size]);

  return (
    <div
      ref={avatarRef}
      className={className}
      style={{ height: size, width: size }}
      aria-label={`Wallet avatar for ${address}`}
    />
  );
}

function getJazziconSeed(address: string) {
  return parseInt(address.slice(2, 10), 16);
}
