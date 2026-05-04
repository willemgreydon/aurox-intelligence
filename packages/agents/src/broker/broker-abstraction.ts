export type BrokerReadinessStatus = {
  ready: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  summary: string;
};

export type BrokerAccountState = {
  accountId: string;
  cashBalance: number;
  portfolioValue: number;
  openPositionCount: number;
  executionTarget: 'simulation';
  liveAllowed: false;
};

export type BrokerPosition = {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentValue: number;
  unrealizedPnl: number;
};

export type OrderValidationResult = {
  valid: boolean;
  reasons: string[];
  warnings: string[];
};

export type OrderSimulationResult = {
  estimatedFillPrice: number;
  estimatedSlippage: number;
  estimatedFees: number;
  estimatedLatencyMs: number;
  estimatedNotional: number;
  riskWarnings: string[];
  simulationOnly: true;
  liveAllowed: false;
};

export type BrokerOrderPreview = {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
};

export interface BrokerInterface {
  getAccountState(): Promise<BrokerAccountState>;
  getPositions(): Promise<BrokerPosition[]>;
  validateOrder(order: BrokerOrderPreview): Promise<OrderValidationResult>;
  simulateOrder(order: BrokerOrderPreview, marketPrice: number): Promise<OrderSimulationResult>;
  estimateFees(notional: number): number;
  checkReadiness(): Promise<BrokerReadinessStatus>;
}

// Simulated broker wraps the existing simulation engine logic (read-only preview)
export class SimulatedBroker implements BrokerInterface {
  constructor(
    private readonly accountId: string,
    private readonly cashBalance: number,
    private readonly positions: BrokerPosition[],
    private readonly portfolioValue: number,
  ) {}

  async getAccountState(): Promise<BrokerAccountState> {
    return {
      accountId: this.accountId,
      cashBalance: this.cashBalance,
      portfolioValue: this.portfolioValue,
      openPositionCount: this.positions.filter((p) => p.quantity > 0).length,
      executionTarget: 'simulation',
      liveAllowed: false,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    return this.positions;
  }

  async validateOrder(order: BrokerOrderPreview): Promise<OrderValidationResult> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (order.quantity <= 0) {
      reasons.push('Quantity must be greater than zero.');
    }

    if (!order.symbol || order.symbol.trim() === '') {
      reasons.push('Symbol is required.');
    }

    if (order.side === 'sell') {
      const pos = this.positions.find((p) => p.symbol === order.symbol);
      if (!pos || pos.quantity < order.quantity) {
        reasons.push(`Insufficient position: have ${pos?.quantity ?? 0}, need ${order.quantity}.`);
      }
    }

    if (order.side === 'buy') {
      const estimatedNotional = order.quantity * (order.limitPrice ?? 0);
      if (estimatedNotional > this.cashBalance && order.limitPrice) {
        warnings.push(`Estimated notional $${estimatedNotional.toFixed(2)} may exceed available cash $${this.cashBalance.toFixed(2)}.`);
      }
    }

    return { valid: reasons.length === 0, reasons, warnings };
  }

  async simulateOrder(
    order: BrokerOrderPreview,
    marketPrice: number,
  ): Promise<OrderSimulationResult> {
    const slippagePct = order.orderType === 'market' ? 0.001 : 0;
    const slippage = marketPrice * slippagePct;
    const fillPrice =
      order.side === 'buy'
        ? marketPrice + slippage
        : marketPrice - slippage;
    const fees = this.estimateFees(fillPrice * order.quantity);
    const riskWarnings: string[] = [];

    const notional = fillPrice * order.quantity;
    if (notional > this.cashBalance * 0.25) {
      riskWarnings.push('Order notional exceeds 25% of available cash.');
    }
    if (slippagePct > 0) {
      riskWarnings.push(`Market order: estimated slippage $${slippage.toFixed(4)} per share.`);
    }

    return {
      estimatedFillPrice: fillPrice,
      estimatedSlippage: slippage,
      estimatedFees: fees,
      estimatedLatencyMs: 50,
      estimatedNotional: notional,
      riskWarnings,
      simulationOnly: true,
      liveAllowed: false,
    };
  }

  estimateFees(notional: number): number {
    // Flat $0 for simulation, broker-specific fee model placeholder
    return Math.max(notional * 0.0005, 0);
  }

  async checkReadiness(): Promise<BrokerReadinessStatus> {
    const checks = [
      {
        name: 'simulation_mode_active',
        passed: true,
        detail: 'Execution target is simulation. No real broker connection required.',
      },
      {
        name: 'cash_available',
        passed: this.cashBalance > 0,
        detail: this.cashBalance > 0 ? `Cash balance $${this.cashBalance.toFixed(2)} available.` : 'No cash available.',
      },
      {
        name: 'live_trading_locked',
        passed: true,
        detail: 'Live trading is permanently locked. Simulation only.',
      },
    ];

    const ready = checks.every((c) => c.passed);
    return {
      ready,
      checks,
      summary: ready
        ? 'Simulation broker ready. Live execution is locked.'
        : 'Simulation broker not ready: ' + checks.filter((c) => !c.passed).map((c) => c.name).join(', '),
    };
  }
}

// Preview broker: no execution, returns quality estimates only
export class PreviewBroker implements BrokerInterface {
  constructor(
    private readonly accountId: string,
    private readonly cashBalance: number,
    private readonly positions: BrokerPosition[],
    private readonly portfolioValue: number,
  ) {}

  async getAccountState(): Promise<BrokerAccountState> {
    return {
      accountId: this.accountId,
      cashBalance: this.cashBalance,
      portfolioValue: this.portfolioValue,
      openPositionCount: this.positions.filter((p) => p.quantity > 0).length,
      executionTarget: 'simulation',
      liveAllowed: false,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    return this.positions;
  }

  async validateOrder(order: BrokerOrderPreview): Promise<OrderValidationResult> {
    const reasons: string[] = [];
    const warnings: string[] = ['PREVIEW MODE: no order will be submitted.'];

    if (order.quantity <= 0) reasons.push('Quantity must be positive.');
    if (!order.symbol) reasons.push('Symbol required.');

    return { valid: reasons.length === 0, reasons, warnings };
  }

  async simulateOrder(
    order: BrokerOrderPreview,
    marketPrice: number,
  ): Promise<OrderSimulationResult> {
    const slippage = order.orderType === 'market' ? marketPrice * 0.0012 : 0;
    const fillPrice = order.side === 'buy' ? marketPrice + slippage : marketPrice - slippage;
    const notional = fillPrice * order.quantity;
    const fees = this.estimateFees(notional);

    return {
      estimatedFillPrice: fillPrice,
      estimatedSlippage: slippage,
      estimatedFees: fees,
      estimatedLatencyMs: 85,
      estimatedNotional: notional,
      riskWarnings: ['PREVIEW: No order submitted. This is an estimate only.'],
      simulationOnly: true,
      liveAllowed: false,
    };
  }

  estimateFees(notional: number): number {
    return Math.max(notional * 0.0005, 0);
  }

  async checkReadiness(): Promise<BrokerReadinessStatus> {
    return {
      ready: true,
      checks: [
        {
          name: 'preview_mode',
          passed: true,
          detail: 'Preview broker is always ready. No real execution occurs.',
        },
        {
          name: 'live_trading_locked',
          passed: true,
          detail: 'Live trading is permanently locked.',
        },
      ],
      summary: 'Preview mode active. No real orders are placed.',
    };
  }
}
