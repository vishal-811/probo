import express, { json } from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import allRoutes from './routes/index'
const app = express();
export const client = createClient();

app.use(express.json());
app.use(cors());

app.use('/',allRoutes);

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to Redis");
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
    
    app.listen(3000,()=>{
        console.log("server is running on port 3000");
    })
}

startServer();



