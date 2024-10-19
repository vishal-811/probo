import express, { Request, Response} from 'express';
import { INR_BALANCES,STOCK_BALANCES } from '../data';
const router = express.Router();


router.post('/mint',(req:Request,res:Response): undefined=>{
    let { userId, stockSymbol, quantity, price } = req.body;
    console.log(userId,stockSymbol,quantity,price);
    if (!userId || !stockSymbol || quantity <=0 || price <=0) {
        res.status(400).json({ message: "Please provide userId, stockSymbol, quantity, and price."});
        return;
    }
  
    if(!INR_BALANCES[userId]){
       res.json({message: "No user exist with this user Id"});
       return;
    }
      if(typeof (quantity) == 'string'){
       quantity =  parseInt(quantity);
      }
      if(typeof(price) == 'string'){
        price =  parseInt(price);
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

export default router