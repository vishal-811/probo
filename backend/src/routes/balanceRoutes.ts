import express, {Request, Response} from 'express';
import { INR_BALANCES, STOCK_BALANCES } from '../data';
const router = express.Router();
  
    //  get a user inr balance 
  router.get('/inr/:userId',(req:Request,res:Response)=>{
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
  router.get('/stock/:userId',(req:Request,res:Response): undefined=>{
    const { userId } = req.params;
    const stockBalances = STOCK_BALANCES[userId]
    if(!stockBalances){
       res.json({message:"The user with this Id does not hold any stock"});
       return;
    }
  
     res.json({message:`your stock bal is ${JSON.stringify(stockBalances)}`});
  })
  
export default router;