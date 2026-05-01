export type TradeStatus =
  | 'open'
  | 'closed_tp'
  | 'closed_sl'
  | 'closed_manual'
  | 'closed_eod';

export type TradeDirection = 'long' | 'short';

export type StrategyName =
  | 'european_close'
  | 'institutional_push'
  | 'mean_reversion';

export interface Trade {
  id: string;
  strategy: StrategyName;
  direction: TradeDirection;
  entry_price: number;
  entry_time: string;
  exit_price: number | null;
  exit_time: string | null;
  stop_loss: number;
  take_profit: number;
  status: TradeStatus;
  pnl_percent: number | null;
  pnl_dollars: number | null;
  notes: string | null;
  created_at: string;
}

export interface Portfolio {
  id: string;
  initial_capital: number;
  current_capital: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  max_drawdown: number;
  best_trade: number;
  worst_trade: number;
  updated_at: string;
}

export interface DailySummary {
  id: string;
  date: string;
  sp500_open: number | null;
  sp500_close: number | null;
  sp500_change_pct: number | null;
  trades_count: number;
  trades_won: number;
  pnl_day: number;
  capital_eod: number | null;
  notes: string | null;
  created_at: string;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  timestamp: string;
  is_market_open: boolean;
}

export interface BotConfig {
  initial_capital: number;
  max_trades_per_day: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  strategies: {
    european_close: boolean;
    institutional_push: boolean;
    mean_reversion: boolean;
  };
}
