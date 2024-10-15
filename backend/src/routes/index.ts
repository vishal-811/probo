import express, { Request, Response } from 'express';
import { INR_BALANCES, STOCK_BALANCES, ORDERBOOK } from '../data';
import { Orderbook, OrderRequest } from '../types';

const router = express.Router();
  
   //Create a User Endpoint.
router.post('/user/create/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  if (INR_BALANCES[userId]) {
      res.status(400).json({ msg: "User already exists with this userId" });
      return;
  }
  // Create user entry in INR_BALANCES and STOCK_BALANCES
  INR_BALANCES[userId] = { balance: 0, locked: 0 };
  STOCK_BALANCES[userId] = {};

    res.status(201).json({ message: `User ${userId} created` });
    return;
});

 
// Create a new Symbol Endpoint. 
router.post('/symbol/create/:stockSymbol',(req:Request,res:Response)=>{
  const { stockSymbol } = req.params;
   Object.keys(STOCK_BALANCES).forEach(userId=>{
      //  If the user already not have that type of stockSymbol
      if(!STOCK_BALANCES[userId][stockSymbol]){
          STOCK_BALANCES[userId][stockSymbol] = {}; // with default empty values.
      }
   })

  res.status(201).json({message:`Symbol ${stockSymbol} created`})
});


  // create an onRamp inr enpoint
router.post('/onramp/inr',(req:Request,res:Response)=>{
  const { userId, amount} = req.body;
  if(!INR_BALANCES[userId]){
     res.json({message:"User doesnot exist with this userId"});
     return;
  }
 if(amount<=0){
    res.json({message:"please choose valid amount"});
    return;
  }
   INR_BALANCES[userId].balance =amount;
   res.status(200).json({message:`Onramped ${userId} with amount ${amount}`});
   return;
   })


   // Get a all users  Balances  ;
router.get('/balances/inr',(req:Request,res:Response) : undefined=>{
  res.status(200).json(INR_BALANCES);
    return;
})

  //  get a user inr balance 
router.get('/balance/inr/:userId',(req:Request,res:Response)=>{
  const { userId }  = req.params;
  const userBalance = INR_BALANCES[userId]
  if(!userBalance){
     res.json({message:"No user exist with this userId"});
      return;
  }

     res.json({message:`User Balance ${userBalance.balance}`});
     return;
})

    // get a user Stock Balance 
router.get('/balance/stock/:userId',(req:Request,res:Response): undefined=>{
  const { userId } = req.params;
  const stockBalances = STOCK_BALANCES[userId]
  if(!stockBalances){
     res.json({message:"The user with this Id does not hold any stock"});
     return;
  }

   res.json({message:`your stock bal is ${JSON.stringify(stockBalances)}`});
})

    //  get all Stock Balances.
router.get('/balances/stock',(req,res) : undefined=>{            
  res.status(200).json(STOCK_BALANCES);
})


  // Mint fresh Token endpoint
router.post('/trade/mint',(req:Request,res:Response): undefined=>{
  const { userId, stockSymbol, quantity, price } = req.body;
  if (!userId || !stockSymbol || quantity == null || price == null) {
      res.status(400).json({ message: "Please provide userId, stockSymbol, quantity, and price."});
      return;
  }

  if(!INR_BALANCES[userId]){
     res.json({message: "No user exist with this user Id"});
     return;
  }

   const availBal = INR_BALANCES[userId].balance
   if(availBal<(price * quantity)){
      res.send({msg:"Insufficient Balance"});
      return;
   }
    
        // Ensure the stock symbol exists for the user
   if (!STOCK_BALANCES[userId][stockSymbol]) {
       STOCK_BALANCES[userId][stockSymbol] = {};
    }
    
        // Initialize 'yes' and 'no' tokens if they don't exist
    if (!STOCK_BALANCES[userId][stockSymbol]['yes']) {
         STOCK_BALANCES[userId][stockSymbol]['yes'] = { quantity: 0, locked: 0 };
    }
    if (!STOCK_BALANCES[userId][stockSymbol]['no']) {
         STOCK_BALANCES[userId][stockSymbol]['no'] = { quantity: 0, locked: 0 };
    }
    
        // Mint tokens for both 'yes' and 'no' types
    STOCK_BALANCES[userId][stockSymbol]['yes'].quantity += quantity;
    STOCK_BALANCES[userId][stockSymbol]['no'].quantity += quantity;
       
    const mintFee  = (price * quantity); // we are making both yes and no tokens 
       //Deduct user Balance for minting
    INR_BALANCES[userId].balance -=mintFee ;
           console.log("Miniting" , JSON.stringify(INR_BALANCES));
    
        // Send response back
    res.status(200).json({
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${INR_BALANCES[userId].balance}`,
    });
    return;
})


   //  Order Sell Route
router.post('/order/sell', (req: Request<{}, {}, OrderRequest>, res: Response): undefined => {
  const { userId, stockSymbol, quantity, price, stockType } = req.body;

    // Validate request fields
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
      ORDERBOOK[stockSymbol] = { 'yes': {}, 'no': {} };
  }

  if (!ORDERBOOK[stockSymbol][stockType]) {
        ORDERBOOK[stockSymbol][stockType] = {};
  }

    // Get the price level or create it if it doesn't exist
  if (!ORDERBOOK[stockSymbol][stockType][price]) {
      ORDERBOOK[stockSymbol][stockType][price] = { total: 0, orders: {} };
  }

    // Update the order book for the current stockSymbol
   ORDERBOOK[stockSymbol][stockType][price].orders[userId] = 
   (ORDERBOOK[stockSymbol][stockType][price].orders[userId] || 0) + quantity;
   ORDERBOOK[stockSymbol][stockType][price].total += quantity;

    res.status(200).json({
        message: "Sell order placed and pending",
    });
    return;
});
    

router.post('/order/buy', (req: Request<{}, {}, OrderRequest>, res: Response): any => {
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

  // Validate stock in stock balances
  const stockBalance = STOCK_BALANCES[stockSymbol];
  if (!stockBalance) {
    res.status(400).json({ message: "This Stock is not valid." });
    return;
  }

  // Check if the user has enough INR balance to place the order
  const requiredAmount = price * quantity;
  if (userBalance.balance < requiredAmount) {
    res.status(400).json({ message: "Insufficient balance" });
    return;
  }

  // Initialize stock in order book if not available
  const stockInOrderbook = ORDERBOOK[stockSymbol] || { yes: {}, no: {} };
  ORDERBOOK[stockSymbol] = stockInOrderbook;

  // Check the available stock type in the order book
  const availableStockType = stockInOrderbook[stockType] || {};
  stockInOrderbook[stockType] = availableStockType;

  // If stock at the given price has less total than requested, trigger a reverse call
  if (availableStockType[price]?.total < quantity && availableStockType[price]?.total !== 0) {
    reverseCall({ stockSymbol, stockType, price, quantity, ORDERBOOK });
  }

  let remainingQuantity = quantity;

  // Iterate over the users in the order book for the given price
  const priceOrders = availableStockType[price]?.orders || {};
  availableStockType[price] = availableStockType[price] || { total: 0, orders: {} };

  for (const [user, userOrderQuantity] of Object.entries(priceOrders)) {
    if (remainingQuantity <= 0 || availableStockType[price].total === 0) break;

    const availableQuantity = userOrderQuantity;

    if (availableQuantity <= remainingQuantity) {
      remainingQuantity -= availableQuantity;

      // Unlock and update user's stock balance
      if (STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]) {
        STOCK_BALANCES[user][stockSymbol][stockType].locked = 0;
      }

      // Increase the seller's INR balance after their stock is sold
      const totalAmount = price * availableQuantity;
      INR_BALANCES[user].balance += totalAmount;

      // Remove the user from orders as their entire order has been fulfilled
      delete availableStockType[price].orders[user];
    } else {
      // Partially fulfill the user's order
      availableStockType[price].orders[user] -= remainingQuantity;

      if (STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]) {
        STOCK_BALANCES[user][stockSymbol][stockType].locked = 0;
        const totalAmount = price * remainingQuantity;
        INR_BALANCES[user].balance += totalAmount;
      }
      remainingQuantity = 0;
    }
  }

  // Update the total available quantity in the order book
  availableStockType[price].total -= quantity;

  // Remove price entry from the order book if no stock is left for this price
  if (availableStockType[price].total === 0) {
    delete availableStockType[price];
  }

  // If not enough tokens are available, trigger a reverse call for the remaining quantity
  if (remainingQuantity !== 0) {
    reverseCall({ stockSymbol, stockType, price, remainingQuantity, ORDERBOOK });
  }

  // Update the user's stock balance
  STOCK_BALANCES[userId] = STOCK_BALANCES[userId] || {};
  STOCK_BALANCES[userId][stockSymbol] = STOCK_BALANCES[userId][stockSymbol] || {};
  STOCK_BALANCES[userId][stockSymbol][stockType] = STOCK_BALANCES[userId][stockSymbol][stockType] || { quantity: 0, locked: 0 };

  STOCK_BALANCES[userId][stockSymbol][stockType].quantity += (quantity - remainingQuantity);

  // Deduct the total spent amount from the user's balance
  INR_BALANCES[userId].balance -= requiredAmount;

  // Respond with success
  res.status(200).json({
    message: "Buy order placed and trade executed",
  });
});

        

// Fetching orderBook details for a particular stock symbol
router.post('/orderbook:stockSymbol',(req:Request,res:Response):undefined=>{
  const { stockSymbol } = req.params;
  if(!ORDERBOOK[stockSymbol]){
    ORDERBOOK[stockSymbol]={yes:{}, no:{}}
  }

   res.status(200).json(ORDERBOOK[stockSymbol]);
})


      // Fetching whole order book.
router.post('/orderbook',(req,res)=>{
  res.status(200).json(ORDERBOOK);
})

interface reverseCallType {
  stockSymbol : string,
  stockType : 'yes' | 'no',
  price :number | string,
  quantity : number,
  ORDERBOOK : Orderbook
}

// Function to  make a reverse call
   function reverseCall({ stockSymbol, stockType, price, quantity, ORDERBOOK }: reverseCallType) {
//   let reverseStockType = stockType === 'yes' ? 'no' : 'yes';
//   if (!ORDERBOOK[stockSymbol]) {
//     ORDERBOOK[stockSymbol] = { yes: {}, no: {} };  
//   }

//   if (!ORDERBOOK[stockSymbol][reverseStockType]) {
//     ORDERBOOK[stockSymbol][reverseStockType] = {};
//   }

//   if (!ORDERBOOK[stockSymbol][reverseStockType][price]) {
//     ORDERBOOK[stockSymbol][reverseStockType][price] = {
//       total: 0,
//       orders: {}
//     };
//   }

//   // Add the new reverse order (lock the user's funds for the unfulfilled quantity)
//   const reverseOrderBookEntry = ORDERBOOK[stockSymbol][reverseStockType][price];
//   reverseOrderBookEntry.total += quantity; // Increase total available stock at this price

//   // Lock the user's funds or stocks for this reverse order
//   const userId = "LOCKED_USER"; // You need to track the user who placed the original buy order
//   if (!reverseOrderBookEntry.orders[userId]) {
//     reverseOrderBookEntry.orders[userId] = 0;
//   }
//   reverseOrderBookEntry.orders[userId] += quantity; // Lock the user's remaining order quantity

//   // Provide feedback that reverse order is created
//   console.log(`Reverse order created for ${quantity} stocks at price ${price} for stock type ${reverseStockType}`);
 }

  
export default router;
