import express, { Request, Response } from 'express';
import { ORDERBOOK } from '../data';
const router = express.Router();


  // Fetching whole order book.
router.post('/',(req,res)=>{
    res.status(200).json(ORDERBOOK);
})

// Fetching orderBook details for a particular stock symbol
router.post('/:stockSymbol',(req:Request,res:Response):undefined=>{
    const { stockSymbol } = req.params;
    if(!ORDERBOOK[stockSymbol]){
      ORDERBOOK[stockSymbol]={yes:{}, no:{}}
    }
  
     res.status(200).json(ORDERBOOK[stockSymbol]);
})
  
  

export default router;