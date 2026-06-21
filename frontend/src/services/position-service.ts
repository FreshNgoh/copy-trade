import { positionRepository } from "@/repositories/position-repository";
import type {
  ClosePosition,
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

export async function getOpenPositions() {
  return positionRepository.getOpenPositions();
}

export async function closePosition(position: ClosePosition) {
  return positionRepository.closePosition(position);
}

export async function getClosedPositions() {
  return positionRepository.getClosedPositions();
}

export async function updateActivePositions(position: UpdatePosition) {
  return positionRepository.updatePosition(position);
}
