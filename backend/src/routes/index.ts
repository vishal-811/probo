import express, { Request, Response } from 'express';
import userRoutes from './userRoutes';
import symbolRoutes from './symbolRoutes';
import orderRoutes from './orderRoutes';
import orderbookRoutes from './orderbookRoutes';
import mintRoutes from './mintRoute';
import onrampRoutes from './onrampRoutes';
import balanceRoutes from './balanceRoutes';
import allbalancesRoutes from './allbalancesRoutes';

const router = express.Router();

//Create a User Endpoint.
router.use('/user', userRoutes);

 
// Create a new Symbol Endpoint. 
router.use('/symbol',symbolRoutes);


// create an onRamp inr enpoint
router.use('/onramp',onrampRoutes);


// get a user inr balance 
// get a user Stock Balance 
router.use('/balance', balanceRoutes);

// Get all user balances 
// Get all user stock balances
router.use('/balances', allbalancesRoutes)

// Mint fresh Token endpoint
router.use('/trade',mintRoutes)

//  OrderRoute for buy and sell
router.use('/order', orderRoutes)  

// Fetching orderBook details for a particular stock symbol
// Fetching whole order book.
router.use('/orderbook',orderbookRoutes);

export default router;
