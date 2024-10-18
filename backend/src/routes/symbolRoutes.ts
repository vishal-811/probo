import express, { Request, Response} from 'express';
import { STOCK_BALANCES } from '../data';
const router = express.Router();

router.post('/create/:stockSymbol',(req:Request,res:Response)=>{
    const { stockSymbol } = req.params;
     Object.keys(STOCK_BALANCES).forEach(userId=>{
        //  If the user already not have that type of stockSymbol
        if(!STOCK_BALANCES[userId][stockSymbol]){
            STOCK_BALANCES[userId][stockSymbol] = {}; // with default empty values.
        }
     })
  
    res.status(201).json({message:`Symbol ${stockSymbol} created`})
  });

export default router;