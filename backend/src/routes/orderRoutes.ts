import express, { Request, Response} from 'express';
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
       client.RPUSH('stockSymbol',JSON.stringify(ORDERBOOK));
       
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
  
    //Initialize stock in orderbook if not available
   if(!ORDERBOOK[stockSymbol]){
      ORDERBOOK[stockSymbol] = { yes: {}, no: {} };
   } 
   if(Object.keys(ORDERBOOK[stockSymbol][stockType]).length === 0){
       ORDERBOOK[stockSymbol][stockType] = {[price] :{total:0 , orders:{}}};
   }  
   
   if(!ORDERBOOK[stockSymbol][stockType][price]?.total){
      ORDERBOOK[stockSymbol][stockType][price].total =0;
   }
   if(ORDERBOOK[stockSymbol][stockType][price]?.total < quantity && ORDERBOOK[stockSymbol][stockType][price].total === 0){
    reverseCall({ stockSymbol, stockType, price, quantity, userId, ORDERBOOK});
    res.json({msg:"Partial Order Placed"})
    return;
}
else if(ORDERBOOK[stockSymbol][stockType][price].total >= quantity || ((ORDERBOOK[stockSymbol][stockType][price].total < quantity 
 && ORDERBOOK[stockSymbol][stockType][price].total!=0 ))){
  let requiredQuantity = quantity;
  
  for(const [ user, userSellQuantity] of Object.entries(ORDERBOOK[stockSymbol][stockType][price].orders)){
    if(requiredQuantity == 0 || ORDERBOOK[stockSymbol][stockType][price].total == 0){
        break;
    }
    if(userSellQuantity.quantity <= requiredQuantity){
       requiredQuantity -= userSellQuantity.quantity;
        
        if(ORDERBOOK[stockSymbol][stockType][price].orders[user].orderType === 'original'){
            // Unlock and update the user's Stock balance
       if(STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]){
        STOCK_BALANCES[user][stockSymbol][stockType].locked = 0;
      }

      // Update the Balance of the user whose order is sold.
     const totalAmount = price * userSellQuantity.quantity;
     INR_BALANCES[user].balance += totalAmount;
       // update Total stocks in the orderbook and Remove the user for the orderBook.
       ORDERBOOK[stockSymbol][stockType][price].total -= userSellQuantity.quantity;
       delete  ORDERBOOK[stockSymbol][stockType][price].orders[user];
       if( ORDERBOOK[stockSymbol][stockType][price].total === 0){
         delete  ORDERBOOK[stockSymbol][stockType][price];
       }
     }else{ // if order type is pseudo, than give the token to both.
         const amount = quantity * price
         INR_BALANCES[user].locked -=amount;
          let reversetype = stockType==="yes" ? "yes" : "no"; 
          if( STOCK_BALANCES[user]){
            //  STOCK_BALANCES[user][stockSymbol][reversetype].quantity += quantity;
          }
     } 
        
     }
     else{
          ORDERBOOK[stockSymbol][stockType][price].orders[user].quantity -= requiredQuantity;
                  // Update the stock balance locked quantity
          if(STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]){
              STOCK_BALANCES[user][stockSymbol][stockType].locked -= requiredQuantity;
              const totalAmount = price * requiredQuantity;
              INR_BALANCES[user].balance += totalAmount;
          }
                  requiredQuantity =0;
    }
  }

    if(requiredQuantity!=0){  //means our half order placed and for half we have to make a reverse call.
       reverseCall({stockSymbol,stockType,requiredQuantity,price, userId,ORDERBOOK})
          // Put the updated Orderbook in a queue
       client.RPUSH('stockSymbol',JSON.stringify(ORDERBOOK));
        res.json({msg:"Partial Order Placed"});
           return;
    }
    client.RPUSH('stockSymbol',JSON.stringify(ORDERBOOK));
    res.json({msg:"Order placed"});
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