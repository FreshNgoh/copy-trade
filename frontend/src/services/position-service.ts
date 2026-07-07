import { positionRepository } from "@/repositories/position-repository";
import type {
  ClosePositionDTO,
  CreatePositionDTO,
  UpdatePosition,
} from "@/types/position";

export async function openOrIncreasePosition(data: CreatePositionDTO) {
  const quantity = Number(data.quantity);
  const entryPrice = Number(data.entry_price);
  const leverage = Number(data.leverage);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    throw new Error("Entry price must be greater than 0");
  }

  if (!Number.isFinite(leverage) || leverage <= 0) {
    throw new Error("Leverage must be greater than 0");
  }

  const existingPosition = await positionRepository.getOpenPosition({
    trader_wallet_address: data.trader_wallet_address,
    symbol: data.symbol,
    direction: data.direction,
  });

  if (!existingPosition) {
    return positionRepository.createMarketOrder(data);
  }

  const oldQty = Number(existingPosition.quantity);
  const oldEntryPrice = Number(existingPosition.entry_price);

  const newQty = oldQty + Number(data.quantity);

  const averageEntryPrice =
    (oldQty * oldEntryPrice +
      Number(data.quantity) * Number(data.entry_price)) /
    newQty;

  return positionRepository.updatePositionAfterFill({
    position_id: existingPosition.position_id,
    quantity: newQty,
    entry_price: averageEntryPrice,
  });
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
