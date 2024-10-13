import express, { Request, Response } from 'express';
import { INR_BALANCES, STOCK_BALANCES, ORDERBOOK } from '../data';
import { OrderRequest } from '../types';

const router = express.Router();


router.get('/help',(req,res):any=>{
      console.log(JSON.stringify(ORDERBOOK));

    return res.json({msg:"haelty"});
})

   //Create a User Endpoint.
router.get('/user/create/:userId', (req: Request, res: Response):any => {
  const { userId } = req.params;
  if (INR_BALANCES[userId]) {
    return res.status(400).json({ msg: "User already exists with this userId" });
  }

  // Create user entry in INR_BALANCES and STOCK_BALANCES
  INR_BALANCES[userId] = { balance: 0, locked: 0 };
  STOCK_BALANCES[userId] = {};

  return res.status(201).json({ message: `User ${userId} created` });
});

 
// Create a new Symbol Endpoint. 
  router.get('/symbol/create/:stockSymbol',(req:Request,res:Response):any=>{
       const { stockSymbol } = req.params;
            
          //   we wanna to show this symbol to everyone thats why we iterate over the STOCK_BALANCES and show the yes no.
        for(let user in STOCK_BALANCES){
          STOCK_BALANCES[user][stockSymbol] = {
            yes: { quantity: 0, locked: 0 },
            no: { quantity: 0, locked: 0 },
        }
      } 
        return res.status(201).json({message:`Symbol ${stockSymbol} created`});
  });


  // create an onRamp inr enpoint
   router.post('/onramp/inr',(req:Request,res:Response):any=>{
       const { userId, amount} = req.body;
         if(!INR_BALANCES[userId]){
            return res.json({message:"User doesnot exist with this userId"});
         }
         if(amount<=0){
            return res.json({message:"please choose valid amount"});
         }
           INR_BALANCES[userId].balance =amount;
         return res.status(200).json({message:`Onramped ${userId} with amount ${amount}`});
   })

  //  get a user inr balance 
    router.get('/balance/inr/:userId',(req:Request,res:Response):any=>{
         const { userId }  = req.params;
            const userBalance = INR_BALANCES[userId]
         if(!userBalance){
            return res.json({message:"No user exist with this userId"});
         }
           return res.json({message:`User Balance ${userBalance.balance}`});
    })

    // Get a User Balances and locked ;
      router.get('/balances/inr',(req:Request,res:Response) : any=>{
          const { userId } = req.body;
            if(INR_BALANCES[userId]){
               return res.json({message:"No user Exist with this UserID"});
            }

            res.status(200).json(INR_BALANCES[userId]);
      })

    // get a user Stock Balance 
     router.get('/balance/stock/:userId',(req:Request,res:Response):any=>{
          const { userId } = req.params;
            const stockBalances = STOCK_BALANCES[userId]
          if(!stockBalances){
             return res.json({message:"The user with this Id does not hold any stock"});
          }

              console.log(stockBalances);
          return res.json({message:`your stock bal is ${JSON.stringify(stockBalances)}`});
     })

    //  get a Balances Stock
       router.get('/balances/stock',(req,res) : any=>{
            const {userId, stockSymbol, stockType }  = req.body;
            if(!STOCK_BALANCES[userId]){
                return res.json({message:"No user exist"})
            }
            if(!STOCK_BALANCES[userId][stockSymbol]){
                return res.json({message:"No Stock exist with this stock ID"});
            }
            
            return res.status(200).json(STOCK_BALANCES[userId][stockSymbol]);
       })


     // Mint fresh Token endpoint
       router.post('/trade/mint',(req:Request,res:Response):any=>{
        const { userId, stockSymbol, quantity, price } = req.body;
        if (!userId || !stockSymbol || quantity == null || price == null) {
            return res.status(400).json({ message: "Please provide userId, stockSymbol, quantity, and price." });
        }
            const availBal = INR_BALANCES[userId].balance;
            if(availBal<price){
              return res.json({msg:"Insufficient Balance"})
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
    
        
        const remainingBalance = INR_BALANCES[userId].balance-price;
    
        // Send response back
        res.status(200).json({
            message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
        });
       })



       //  Order Sell Route
     router.post('/order/sell', (req: Request<{}, {}, OrderRequest>, res: Response): any => {
     const { userId, stockSymbol, quantity, price, stockType } = req.body;
      if (!userId || !stockSymbol || !quantity || !price || !stockType) {
        return res.status(400).json({ message: "Please fill all the fields" });
      }

      if (stockType !== 'yes' && stockType !== 'no') {
        return res.status(400).json({ message: "Invalid stock type" });
       }

      // Check if the user exists in the stock balances
       const userStocks = STOCK_BALANCES[userId];
       if (!userStocks || !userStocks[stockSymbol]) {
       return res.status(400).json({ message: "User doesn't hold the stock or invalid stock symbol" });
      }

      const stockDetails = userStocks[stockSymbol][stockType];
      if (!stockDetails) {
       return res.status(400).json({ message: `User doesn't hold any ${stockType} stocks of ${stockSymbol}` });
      }

  // Check if the user has enough stock to sell
      if (stockDetails.quantity < quantity) {
        return res.status(400).json({ message: "Not enough stock to sell" });
      }

  // Lock the quantity of stock being sold
         stockDetails.quantity -= quantity;
         stockDetails.locked += quantity;

          return res.status(201).json({
             message: `Sell order placed for ${quantity} '${stockType}' options of ${stockSymbol} at price ${price}`,
          });
   });


  //  Buy the stocks
  router.post('/order/buy', (req: Request<{}, {}, OrderRequest>, res: Response) : any=> {
    const { userId, stockSymbol, quantity, price, stockType } = req.body;
  
    // Validate input
    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
      return res.json({ message: "Please provide all fields" });
    }
  
    const availStock = ORDERBOOK[stockSymbol];
    if (!availStock) {
      return res.json({ msg: "This stock is not available to sell" });
    }
  
    const availStockType = availStock[stockType];
       console.log(availStockType);
    if (!availStockType || Object.keys(availStockType).length ===0) { // if there is no stock availble of the Selected type.
      return res.json({ msg: "This type of stock is not available to sell" });
    }
  
    if (!availStockType[price] || availStockType[price].total < quantity) {
      return res.json({ msg: "Not enough stock available at this price" });
    }
  
    let remainingQuantity = quantity;
  
    // Iterate over the users in the order book for the given price
     for(const [user, userOrderAmount] of Object.entries(availStockType[price].orders)) {
      if (remainingQuantity <= 0) return true;
  
      const availableAmount = userOrderAmount;
      if (availableAmount <= remainingQuantity) {
        remainingQuantity -= availableAmount;
        // Update the locked quantity at the stockBalance variable
        if (STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]) {
          STOCK_BALANCES[user][stockSymbol][stockType]!.locked = 0;
        }
        delete availStockType[price].orders[user];
      } else {
        availStockType[price].orders[user] -= remainingQuantity;
        if (STOCK_BALANCES[user]?.[stockSymbol]?.[stockType]) {
          STOCK_BALANCES[user][stockSymbol][stockType]!.locked = 0;
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
  
    return res.json({
      message: `Successfully bought ${quantity - remainingQuantity} stocks of ${stockSymbol} at price ${price}`,
    });
  });
      

// Fetching orderBook details
      router.post('/orderbook',(req:Request,res:Response):any=>{
         const { stockSymbol } = req.body;
           if(!ORDERBOOK[stockSymbol]){
              ORDERBOOK[stockSymbol]={yes:{}, no:{}}
           }

           return res.status(200).json(ORDERBOOK[stockSymbol]);
      })
export default router;
