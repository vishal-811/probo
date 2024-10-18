import express, {Request, Response} from 'express';
import { INR_BALANCES, STOCK_BALANCES } from '../data';
const router = express.Router();

router.post('/inr',(req:Request,res:Response)=>{
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

export default router;