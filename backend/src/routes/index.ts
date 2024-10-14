import express, { Request, Response } from 'express';
import { INR_BALANCES, STOCK_BALANCES, ORDERBOOK } from '../data';
import { OrderRequest } from '../types';

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
  ORDERBOOK[stockSymbol] = {
     yes: {"0":{total:0, orders:{}}},
     no:  {"0":{total:0, orders:{}}},
  }

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

        // Ensure the user exists in STOCK_BALANCES
   if (!STOCK_BALANCES[userId]) {
       STOCK_BALANCES[userId] = {};
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
       
    const TotalSpend  = (price * quantity) * 2; // we are making both yes and no tokens 
    const remainingBalance = INR_BALANCES[userId].balance-TotalSpend;
    INR_BALANCES[userId].balance = remainingBalance;
           console.log("Miniting" , JSON.stringify(INR_BALANCES));
    
        // Send response back
    res.status(200).send({
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
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
      //  Validate that the user Exist with this id or not
  const validateUser = INR_BALANCES[userId];
  if(!validateUser){
      res.json({message:"No user exist with this UserId"});
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
    
        // Get the  priceLevel or create it if it doesn't exist
    if (!ORDERBOOK[stockSymbol][stockType][price]) {
         ORDERBOOK[stockSymbol][stockType][price] = { total: 0, orders: {} };
    }
    
        // Update the order book
    const currentOrder = ORDERBOOK[stockSymbol][stockType][price];
    currentOrder.orders[userId] = (currentOrder.orders[userId] || 0) + quantity;
    currentOrder.total += quantity;
       console.log(JSON.stringify(ORDERBOOK));

    res.status(200).json({
        message:"Sell order placed and pending",
    });
    return;
});
    

  //  Buy the stocks
router.post('/order/buy', (req: Request<{}, {}, OrderRequest>, res: Response) : any=> {
  const { userId, stockSymbol, quantity, price, stockType } = req.body;
  
    // Validate input
  if (!userId || !stockSymbol || !quantity || !price || !stockType) {
      res.json({ message: "Please provide all fields" });
      return;
  }

  const availStock = ORDERBOOK[stockSymbol];
  if (!availStock) {
       res.json({ msg: "This stock is not available to sell" });
       return;
  }
  
  const availStockType = availStock[stockType];
  if (!availStockType || Object.keys(availStockType).length ===0) { // if there is no stock availble of the Selected type.
       res.json({ msg: "This type of stock is not available to sell" });
       return;
  }
      // Pending --- Instead of this create a sell order for the other type and create an order in the order book.
  if (!availStockType[price] || availStockType[price].total < quantity) {
       res.json({ msg: "Not enough stock available at this price" });
       return;
  }
  
  let remainingQuantity = quantity;
    // Iterate over the users in the order book for the given price
  for(const [user, userOrderquantity] of Object.entries(availStockType[price].orders)) {
    if (remainingQuantity <= 0) break;
  
    const availablequantity = userOrderquantity;  //checking each user order quantity in a FIFO.
    if (availablequantity <= remainingQuantity) {
        remainingQuantity -= availablequantity;

        // Update the locked quantity at the stockBalance variable
        if (STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]) {
            STOCK_BALANCES[user][stockSymbol][stockType]!.locked = 0;
        }
          //  Increase the user balance, whose stock is sold.
        const totalAmount = price * availablequantity;
        INR_BALANCES[user].balance += totalAmount;
        delete availStockType[price].orders[user];
    } else {
        availStockType[price].orders[user] -= remainingQuantity;
        if (STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]) {
          STOCK_BALANCES[user][stockSymbol][stockType]!.locked = 0;
          const totalAmount = price * availablequantity;
           INR_BALANCES[user].balance += totalAmount;
        }
        remainingQuantity = 0;
      }
  }   
  
     // Update the total available quantity in the orderbook
     availStockType[price].total -= quantity;
  
    // If the total for this price drops to zero, remove the price entry from the order book
    if (availStockType[price].total <= 0) {
        delete availStockType[price];
    }
  
    // Update the user's stock balance
    if (!STOCK_BALANCES[userId]) {
        STOCK_BALANCES[userId] = {};
    }
    if (!STOCK_BALANCES[userId][stockSymbol]) {
         STOCK_BALANCES[userId][stockSymbol] = {};
    }
    if (!STOCK_BALANCES[userId][stockSymbol][stockType]) {
        STOCK_BALANCES[userId][stockSymbol][stockType] = { quantity: 0, locked: 0 };
    }
  
    STOCK_BALANCES[userId][stockSymbol][stockType]!.quantity += (quantity - remainingQuantity);
           const Totalspend  = price * quantity;
          const total = INR_BALANCES[userId].balance;
          const balance = total - Totalspend;
           INR_BALANCES[userId].balance = balance;
      res.status(200).json({
      message:"Buy order placed and trade executed",
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
  res.json(ORDERBOOK);
})


export default router;
