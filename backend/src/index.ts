import express from 'express';
import cors from 'cors';
import allRoutes from './routes/index'
const app = express();

app.use(express.json());
app.use(cors());

app.use('/',allRoutes);

app.listen(3000,()=>{
    console.log("Server is running");
})
