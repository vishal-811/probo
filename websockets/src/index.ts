import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { createClient } from 'redis';

const server = http.createServer(function(requset,response){
     response.end("Hi there");
})

const wss = new WebSocketServer({server}); //create a new websocket instance at same port where our server is running.

const client = createClient();
wss.on('connection',function connection(ws){
    ws.on('error',console.error);
        // User send a message, which Stock they want to subscribe, we put the userId in the same stock room.
        ws.on('message',function message(data,isBinary){  // if client send message, than call message callback function.
            console.log(data);
        })
        
});

async function sendorderbookData(orderbook : string) {
    // Send the updated orderbook to the client.
   wss.clients.forEach(function each(client){
      if(client.readyState === WebSocket.OPEN){
        client.send(orderbook); // send orderbook as a string.
      }
   })
}

async function popFromQueue(){
   while(true){ //polling the redis queue.
    const orderbook = await client.blPop('stockSymbol',0);
    //send orderbook data to all the clients who are on that event/ room.
    if(orderbook){
        await sendorderbookData(orderbook.element);
    }
   }
}

async function startServer(){
   try {
    await client.connect();
    console.log("Connected to redis");

    // pop data from a redis queue
    popFromQueue();
   } catch (error) {
      console.error(error);
   }
 
  server.listen(3001,()=>{
     console.log("Server is running on port 3001"); //websocket server is listening on port 3001.
  })
}

startServer();