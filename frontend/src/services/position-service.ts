import { positionRepository } from "@/repositories/position-repository";
import type {
  ClosePositionDTO,
  CreatePositionDTO,
  UpdatePosition,
} from "@/types/position";

export async function createPosition(position: CreatePositionDTO) {
  if (position.quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (position.entry_price <= 0) {
    throw new Error("Entry price must be greater than 0");
  }

  return positionRepository.createMarketOrder(position);
}

export async function getOpenPositions(traderWalletAddress: string) {
  return positionRepository.getOpenPositions(traderWalletAddress);
}

export async function closePosition(position: ClosePositionDTO) {
  return positionRepository.closePosition(position);
}

export async function getClosedPositions(traderWalletAddress: string) {
  return positionRepository.getClosedPositions(traderWalletAddress);
}

export async function updateActivePositions(position: UpdatePosition) {
  return positionRepository.updatePosition(position);
}
