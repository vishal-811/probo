import express, { json, Request, Response} from 'express';
import { OrderRequest, reverseCallType } from '../types';
import { INR_BALANCES,STOCK_BALANCES, ORDERBOOK } from '../data';
import { client } from '../index';
const router = express.Router();

router.post('/sell', (req: Request<{}, {}, OrderRequest>, res: Response): undefined => {
    const { userId, stockSymbol, quantity, price, stockType } = req.body;

    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
        res.status(400).json({ message: "Please fill all the fields" });
        return;
    }
  
      // Validate that the user exists with this ID
    const validateUser = INR_BALANCES[userId];
    if (!validateUser) {
        res.json({ message: "No user exists with this UserId" });
        return;
    }
      // Validate stock type
    if (stockType !== 'yes' && stockType !== 'no') {
        res.status(400).json({ message: "Invalid stock type" });
        return;
    }
  
      // Check if the user exists in the stock balances
    const userStocks = STOCK_BALANCES[userId];
    if (!userStocks || !userStocks[stockSymbol]) {
        res.status(400).json({ message: "User doesn't hold the stock or invalid stock symbol" });
        return;
    }
  
      // Check if the user holds the given type of stock
    const stockDetails = userStocks[stockSymbol][stockType];
    if (!stockDetails) {
        res.status(400).json({ message: `User doesn't hold any ${stockType} stocks of ${stockSymbol}` });
        return;
    }
  
      // Check if the user has enough stock to sell
    if (stockDetails.quantity < quantity) {
        res.status(400).json({ message: "Not enough stock to sell" });
        return;
    }
      // Lock the quantity of stock being sold
    stockDetails.quantity -= quantity;
    stockDetails.locked = (stockDetails.locked || 0) + quantity;
  
    // Ensure the stock symbol and stock type exist in the ORDERBOOK
    if (!ORDERBOOK[stockSymbol]) {
        ORDERBOOK[stockSymbol] = { 'yes': {}, 'no': {}};
    }
    if (!ORDERBOOK[stockSymbol][stockType]) {
          ORDERBOOK[stockSymbol][stockType] = {};
    }
  
      // Get the price level or create it if it doesn't exist
    if (!ORDERBOOK[stockSymbol][stockType][price]) {
        ORDERBOOK[stockSymbol][stockType][price] = { total: 0, orders: {} };
    }
    if(!ORDERBOOK[stockSymbol][stockType][price].orders[userId]){
       ORDERBOOK[stockSymbol][stockType][price].orders[userId] = {quantity: 0 , orderType : "original"};
    }
      // Update the order book for the current stockSymbol
        ORDERBOOK[stockSymbol][stockType][price].orders[userId].quantity = 
        (ORDERBOOK[stockSymbol][stockType][price].orders[userId].quantity || 0) + quantity;
        ORDERBOOK[stockSymbol][stockType][price].total += quantity;

    //  Update the orderType also like it is original order
    ORDERBOOK[stockSymbol][stockType][price].orders[userId].orderType = "original";
        // push to redis queue.
      client.RPUSH('stockSymbol',JSON.stringify({symbol: stockSymbol, orderbook: ORDERBOOK[stockSymbol]}));    
      res.status(200).json({
          message: "Sell order placed and pending",
      });
      return;
  });
      
  
router.post('/buy', (req: Request<{}, {}, OrderRequest>, res: Response): any => {
const { userId, stockSymbol, quantity, price, stockType } = req.body;
  
    // Ensure all required fields are provided
if (!userId || !stockSymbol || !quantity || !price || !stockType) {
     res.status(400).json({ message: "Please provide all fields" });
      return;
}
  
    // Validate user balance
const userBalance = INR_BALANCES[userId];
if (!userBalance) {
    res.status(400).json({ message: "No user exists with this userId" });
    return;
}
  
  // Check if the user has enough INR balance to place the order
const requiredAmount = price * quantity;
if (userBalance.balance < requiredAmount) {
    res.status(400).json({ message: "Insufficient balance" });
    return;
}

// Check the stock symbol exist in the order book or not 
if(!ORDERBOOK[stockSymbol]){
  ORDERBOOK[stockSymbol] = {"yes" :{}, "no":{}};
}
// Check if the stock type exist in the order book
if(Object.keys(ORDERBOOK[stockSymbol][stockType]).length === 0){
  ORDERBOOK[stockSymbol][stockType] = {[price] :{total:0 , orders:{}}};
}  
//If the qvailable stock is equal to 0, create a reverse order
   console.log(ORDERBOOK[stockSymbol][stockType][price]);
if(ORDERBOOK[stockSymbol][stockType][price].total < quantity && ORDERBOOK[stockSymbol][stockType][price].total === 0){
   reverseCall({ stockSymbol, stockType, price, quantity, userId, ORDERBOOK});
   const amount = price * quantity;
   INR_BALANCES[userId].balance -= amount;
  //Push the updated order book to the queue
  client.rPush("orderBook",JSON.stringify({symbol: stockSymbol, orderbook: ORDERBOOK[stockSymbol]}));
  res.json({msg:"Partial order placed 1"});
  return;
}
let requiredQuantity = quantity;
// If the stock avialble is greater than the quantity in this case two option is there sell order is original or pseudo
if(ORDERBOOK[stockSymbol][stockType][price].total != 0){
   for( const [user, userSellQuantity] of Object.entries(ORDERBOOK[stockSymbol][stockType][price].orders)){

      if(requiredQuantity <= 0 || ORDERBOOK[stockSymbol][stockType][price].total === 0){
        break;
      }
      if(userSellQuantity.orderType === "original"){
         requiredQuantity -= userSellQuantity.quantity;
         const amount = userSellQuantity.quantity * price;
         if(STOCK_BALANCES[user][stockSymbol][stockType]){
           STOCK_BALANCES[user][stockSymbol][stockType].locked -=userSellQuantity.quantity;
         }
         INR_BALANCES[user].balance += amount; //increase the balance of the user who sell the Stock.
         ORDERBOOK[stockSymbol][stockType][price].total -= userSellQuantity.quantity;
         delete  ORDERBOOK[stockSymbol][stockType][price].orders[user];
         if( ORDERBOOK[stockSymbol][stockType][price].total === 0){
            delete  ORDERBOOK[stockSymbol][stockType][price];
         }
      }
      else{ //if the ordertype is pseudo.
         requiredQuantity -= userSellQuantity.quantity;
         const stockReverseType = stockType === 'yes' ? 'no' : 'yes'
         const amount = quantity * price;
        //  Unlock the user money and Give them reversetype stock
            INR_BALANCES[user].locked -=amount;
            if(STOCK_BALANCES[user][stockSymbol][stockReverseType]){
               STOCK_BALANCES[user][stockSymbol][stockReverseType].quantity +=quantity;
            }
      }
   }
}

if(requiredQuantity>0){
  //Deduct the money for the fulfilled stock qunatity also deduct their balance.
  const FullFilledQunatity = quantity - requiredQuantity;
  const amount = FullFilledQunatity * price;
  INR_BALANCES[userId].balance -= amount;
  if( STOCK_BALANCES[userId][stockSymbol][stockType]){
    STOCK_BALANCES[userId][stockSymbol][stockType].quantity +=FullFilledQunatity;
  }
  reverseCall({stockSymbol, stockType, userId, requiredQuantity,price,ORDERBOOK});
  // Send the orderbook to the Redis queue
  client.RPUSH("orderBook",JSON.stringify({symbol: stockSymbol, orderbook: ORDERBOOK[stockSymbol]}));
  res.json({msg:"Partial Order Placed"});
  return;
}
else{ //if the user order is fulfilled, requiredQuantity equals to 0.
  // Deduct the user balance who bought the Stocks and increase their stocks
  const amount = quantity * price;
  INR_BALANCES[userId].balance -= amount;
  if(!STOCK_BALANCES[userId]){
    STOCK_BALANCES[userId] = {[stockSymbol]:{}};
  }
  if(!STOCK_BALANCES[userId][stockSymbol]){
     STOCK_BALANCES[userId][stockSymbol] = {yes:{quantity: 0, locked:0}, no:{quantity:0, locked: 0}};
  }
  if(STOCK_BALANCES[userId][stockSymbol][stockType]){
     STOCK_BALANCES[userId][stockSymbol][stockType].quantity += quantity;
  }
  client.rPush("orderBook", JSON.stringify({symbol: stockSymbol, orderbook: ORDERBOOK[stockSymbol]}));
  res.json({msg:"order fulfilled"})
}
});
  
 

  // Function to  make a reverse call
    function reverseCall({ stockSymbol, stockType, price, quantity, userId, requiredQuantity, ORDERBOOK }: reverseCallType) {
    const newStocks = quantity ? quantity : requiredQuantity;
    let reverseStockType = stockType;
    if(stockType == "yes"){
       reverseStockType = "no";
    }
    else{
      reverseStockType = "yes";
    }
    if (!ORDERBOOK[stockSymbol]) {
      ORDERBOOK[stockSymbol] = {yes:{}, no:{}};  
    }
  
    // if (!ORDERBOOK[stockSymbol][reverseStockType]) {
    //   ORDERBOOK[stockSymbol][reverseStockType] = {};
    // }
  
    if (!ORDERBOOK[stockSymbol][reverseStockType][price]) {
      ORDERBOOK[stockSymbol][reverseStockType][price] = {
        total: 0,
        orders: {}
      };
    }
    // Add the new reverse order (lock the user's funds for the unfulfilled quantity
   if(newStocks){ // Increase total available stock at this price
    ORDERBOOK[stockSymbol][reverseStockType][price].total += newStocks;
   } 
  
    if (!ORDERBOOK[stockSymbol][reverseStockType][price].orders[userId]) {
       ORDERBOOK[stockSymbol][reverseStockType][price].orders[userId]= {quantity : 0, orderType:"pseudo"};
    }
    if(newStocks){ // Lock the user's remaining order quantity
      ORDERBOOK[stockSymbol][reverseStockType][price].orders[userId].quantity += newStocks
    } 
    //Lock the user balance for pending reverse stocks.
    if(newStocks){
      if(typeof price == 'string'){
       price = parseInt(price)
      }
      const totalAmount = newStocks * price;
      INR_BALANCES[userId].locked += totalAmount
    }
    return ORDERBOOK[stockSymbol][reverseStockType][price];
    }
  
export default  router;