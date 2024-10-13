
export interface UserBalance {
    balance: number;
    locked: number;
  }
  
  export interface INRBalances {
    [key: string]: UserBalance; 
  }

interface Orders {
    [userId: string]: number;
  }
  
  interface PriceLevel {
    total: number;
    orders: Orders;
  }
  
  export interface OrderSide {
    [price: string | number]: PriceLevel;
  }
  
  export interface Orderbook {
    [symbol: string]: {
      yes: OrderSide;
      no: OrderSide;
    };
  }
  
interface StockDetail {
    quantity: number;
    locked: number;
  }
  
  interface StockSide {
    yes?: StockDetail;
    no?: StockDetail;
  }
  
  export interface StockBalances {
    [userId: string]: {
      [symbol: string]: StockSide;
    };
  }

  export interface OrderRequest {
    userId: string;
    stockSymbol: string;
    quantity: number;
    price: number;
    stockType: 'yes' | 'no';
  }