
export interface UserBalance {
    balance: number;
    locked: number;
  }
  
  export interface INRBalances {
    [key: string]: UserBalance; 
  }

interface Orders {
    [userId: string]: {quantity:number , orderType : "original" | "pseudo"};
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


  export interface reverseCallType {
    stockSymbol : string,
    stockType : 'yes' | 'no',
    price :number | string,
    quantity? : number,
    requiredQuantity?:number,
    userId:string,
    ORDERBOOK : Orderbook
  }