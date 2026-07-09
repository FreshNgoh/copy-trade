import { decodeBytes32String, encodeBytes32String, parseUnits } from "ethers";

export const DIRECTION_LONG = 0;
export const DIRECTION_SHORT = 1;

export function stringToBytes32(value: string): string {
  return encodeBytes32String(value.trim());
}

export function bytes32ToString(value: string): string {
  return decodeBytes32String(value);
}

export function toUnixTimestamp(value: string | number | Date): number {
  if (typeof value === "number") return Math.floor(value);

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  return Math.floor(timestamp / 1000);
}

export function parseScaledInteger(value: string | number, decimals: number): bigint {
  const normalized = String(value).replace(/[$,%\s]/g, "");
  return parseUnits(normalized, decimals);
}

export function parseDirection(direction: string): number {
  const normalized = direction.trim().toLowerCase();

  if (normalized === "long") return DIRECTION_LONG;
  if (normalized === "short") return DIRECTION_SHORT;

  throw new Error(`Unsupported trade direction: ${direction}`);
}
