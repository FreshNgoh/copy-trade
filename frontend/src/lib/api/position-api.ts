import {
  ClosePosition,
  CreatePositionDTO,
  UpdatePosition,
} from "@/types/position";

export async function createPositionApi(position: CreatePositionDTO) {
  const response = await fetch("/api/positions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(position),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create position");
  }

  console.log("Position created:", data);

  return data;
}

export async function getPositionsApi() {
  const response = await fetch("/api/positions?status=OPEN", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Positions fetched:", data);
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch positions");
  }

  return data;
}

export async function closePositionApi(postition: ClosePosition) {
  const response = await fetch("/api/positions", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postition),
  });

  const data = await response.json();

  console.log("Position closed:", data);

  if (!response.ok) {
    throw new Error(data.error || "Failed to close position");
  }

  return data;
}

export async function getClosedPositionsApi() {
  const response = await fetch("/api/positions?status=CLOSED", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Positions fetched:", data);
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch position history");
  }

  return data;
}

export async function updateActivePositionsApi(position: UpdatePosition) {
  const response = await fetch("/api/positions", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(position),
  });

  const data = await response.json();

  console.log("Positions fetched:", data);

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch position");
  }

  return data;
}
