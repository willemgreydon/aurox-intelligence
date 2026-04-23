export type OrderStatus =
  | "draft"
  | "submitted"
  | "partially_filled"
  | "filled"
  | "rejected"
  | "cancelled";

export interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  filledQuantity: number;
  price?: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export function transitionOrder(
  order: Order,
  next: OrderStatus,
  patch: Partial<Order> = {}
): Order {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    draft: ["submitted", "cancelled"],
    submitted: ["partially_filled", "filled", "rejected"],
    partially_filled: ["filled", "cancelled"],
    filled: [],
    rejected: [],
    cancelled: []
  };

  if (!allowed[order.status].includes(next)) {
    throw new Error(`Invalid transition ${order.status} → ${next}`);
  }

  return {
    ...order,
    ...patch,
    status: next,
    updatedAt: Date.now()
  };
}