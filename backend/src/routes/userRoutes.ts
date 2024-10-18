import express, { Request, Response} from 'express';
import { INR_BALANCES, STOCK_BALANCES } from '../data';
const router = express.Router();

router.post('/create/:userId', (req: Request, res: Response) => {
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

  export default router;