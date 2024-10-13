import express, { Request, Response } from 'express';
import { INR_BALANCES, STOCK_BALANCES, ORDERBOOK } from '../data';
import { OrderRequest } from '../types';

const router = express.Router();

   //Create a User Endpoint.
router.get('/user/create/:userId', (req: Request, res: Response) => {
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
  router.get('/symbol/create/:stockSymbol',(req:Request,res:Response)=>{
       const { stockSymbol } = req.params;
            
          //   we wanna to show this symbol to everyone thats why we iterate over the STOCK_BALANCES and show the yes no.
        for(let user in STOCK_BALANCES){
          STOCK_BALANCES[user][stockSymbol] = {
            yes: { quantity: 0, locked: 0 },
            no: { quantity: 0, locked: 0 },
        }
      } 
         res.status(201).json({message:`Symbol ${stockSymbol} created`});
         return;
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

    // Get a User Balances and locked ;
      router.get('/balances/inr',(req:Request,res:Response) : any=>{
          const { userId } = req.body;
            if(INR_BALANCES[userId]){
                res.json({message:"No user Exist with this UserID"});
                return;
            }

            res.status(200).json(INR_BALANCES[userId]);
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

    //  get a Balances Stock
       router.get('/balances/stock',(req,res) : undefined=>{
            const {userId, stockSymbol, stockType }  = req.body;
            if(!STOCK_BALANCES[userId]){
                 res.json({message:"No user exist"})
                 return;
            }
            if(!STOCK_BALANCES[userId][stockSymbol]){
                 res.json({message:"No Stock exist with this stock ID"});
                 return;
            }
            
             res.status(200).json(STOCK_BALANCES[userId][stockSymbol]);
       })


     // Mint fresh Token endpoint
       router.post('/trade/mint',(req:Request,res:Response): undefined=>{
        const { userId, stockSymbol, quantity, price } = req.body;
        if (!userId || !stockSymbol || quantity == null || price == null) {
             res.status(400).json({ message: "Please provide userId, stockSymbol, quantity, and price." });
             return;
        }
            const availBal = INR_BALANCES[userId].balance;
            if(availBal<price){
               res.json({msg:"Insufficient Balance"});
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
    
        
        const remainingBalance = INR_BALANCES[userId].balance-price;
    
        // Send response back
        res.status(200).json({
            message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
        });
       })



       //  Order Sell Route
     router.post('/order/sell', (req: Request<{}, {}, OrderRequest>, res: Response): undefined => {
     const { userId, stockSymbol, quantity, price, stockType } = req.body;
      if (!userId || !stockSymbol || !quantity || !price || !stockType) {
         res.status(400).json({ message: "Please fill all the fields" });
         return;
      }

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

      const stockDetails = userStocks[stockSymbol][stockType];
      if (!stockDetails) {
        res.status(400).json({ message: `User doesn't hold any ${stockType} stocks of ${stockSymbol}` });
        return;
      }

  // Check if the user has enough stock to sell
      if (stockDetails.quantity < quantity) {
         res.status(400).json({ message: "Not enough stock to sell" });
         return
      }

  // Lock the quantity of stock being sold
         stockDetails.quantity -= quantity;
         stockDetails.locked += quantity;

           res.status(201).json({
             message: `Sell order placed for ${quantity} '${stockType}' options of ${stockSymbol} at price ${price}`,
          });
   });


  //  Buy the stocks
  router.post('/order/buy', (req: Request<{}, {}, OrderRequest>, res: Response) : undefined=> {
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
       console.log(availStockType);
    if (!availStockType || Object.keys(availStockType).length ===0) { // if there is no stock availble of the Selected type.
       res.json({ msg: "This type of stock is not available to sell" });
       return;
    }
  
    if (!availStockType[price] || availStockType[price].total < quantity) {
       res.json({ msg: "Not enough stock available at this price" });
       return;
    }
  
    let remainingQuantity = quantity;
  
    // Iterate over the users in the order book for the given price
     for(const [user, userOrderAmount] of Object.entries(availStockType[price].orders)) {
      if (remainingQuantity <= 0) break;
  
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
  
      res.json({
      message: `Successfully bought ${quantity - remainingQuantity} stocks of ${stockSymbol} at price ${price}`,
    });
  });
      

// Fetching orderBook details
      router.post('/orderbook',(req:Request,res:Response):undefined=>{
         const { stockSymbol } = req.body;
           if(!ORDERBOOK[stockSymbol]){
              ORDERBOOK[stockSymbol]={yes:{}, no:{}}
           }

            res.status(200).json(ORDERBOOK[stockSymbol]);
      })
export default router;
