import { encodePacked, formatUnits, hexToString, stringToHex, type Hex } from "viem";

export function formatScaledNumber(value: bigint, decimals: number): string {
  return formatUnits(value, decimals);
}

export function formatPrice(value: bigint, decimals: number): string {
  return `$${formatScaledNumber(value, decimals)}`;
}

export function formatQuantity(value: bigint, decimals: number, symbol: string): string {
  const baseAsset = symbol.split("/")[0] || "";
  return `${formatScaledNumber(value, decimals)} ${baseAsset}`.trim();
}

export function formatPnl(value: bigint, decimals: number): string {
  return formatSignedScaledNumber(value, decimals, "$");
}

export function formatRoi(value: bigint, decimals: number): string {
  return formatSignedScaledNumber(value, decimals, "", "%");
}

export function formatTimestamp(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

export function bytes32ToString(value: Hex): string {
  return hexToString(value, { size: 32 }).replace(/\0/g, "");
}

export function stringToBytes32(value: string): Hex {
  return encodePacked(["bytes32"], [stringToHex(value, { size: 32 })]);
}

function formatSignedScaledNumber(
  value: bigint,
  decimals: number,
  prefix = "",
  suffix = ""
): string {
  const sign = value < 0n ? "-" : "+";
  const absoluteValue = value < 0n ? -value : value;

  return `${sign}${prefix}${formatScaledNumber(absoluteValue, decimals)}${suffix}`;
}
