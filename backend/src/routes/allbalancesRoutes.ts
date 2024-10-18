import express, {Request, Response} from 'express';
import { INR_BALANCES, STOCK_BALANCES } from '../data';
const router = express.Router();


     // Get a all users  Balances  ;
  router.get('/inr',(req:Request,res:Response) : undefined=>{
    res.status(200).json(INR_BALANCES);
      return;
  })
  

  router.get('/stock',(req,res) : undefined=>{            
    res.status(200).json(STOCK_BALANCES);
  })

  export default router;