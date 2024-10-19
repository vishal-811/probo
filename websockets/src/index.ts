import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { createClient } from 'redis';

const server = http.createServer(function(request, response) {
    response.end("Hi there");
});

const wss = new WebSocketServer({ server });

const subscriptions: {
    symbol: string,
    subscribers: WebSocket[]
}[] = [];

function findSubScription(symbol: string) {
    console.log(subscriptions.find(data => data.symbol === symbol));
    return subscriptions.find(data => data.symbol === symbol);
}

function handleWebsocketMessage(message: any, ws: WebSocket) {
    let data;
    try {
        data = JSON.parse(message.toString()); // Parse the incoming message
    } catch (error) {
        console.error("Error parsing message:", error);
        return; // Exit if parsing fails
    }
    
    const type = data.type;
    const symbol = data.symbol;

    if (type === 'subscribe') {
        let subscription = findSubScription(symbol);
        if (!subscription) {
            subscription = { symbol: symbol, subscribers: [] }; // Create a new subscription
            subscriptions.push(subscription); // Add to subscriptions array
        }
        subscription.subscribers.push(ws); // Add the WebSocket connection to subscribers

    } else if (type === 'unsubscribe') {
        let subscription = findSubScription(symbol);
        if (!subscription) return;
        subscription.subscribers = subscription.subscribers.filter(subscriber => subscriber !== ws); // Remove subscriber
    }
}

function handleCloseEvent(ws : WebSocket){
    // Iterate over all the objects and delete the user where the user have subscribed
    subscriptions.forEach(subscription => {
        subscription.subscribers.filter(userId =>{
            userId != ws
        })
    })
}
const client = createClient();
wss.on('connection', (ws) => {
    ws.on('error', console.error);
    ws.on('message', (message) => {
        handleWebsocketMessage(message, ws);
    });

    ws.on('close',()=>handleCloseEvent(ws))
});

async function sendOrderbookData(symbol: string, orderbook: string) {
    const subscription = findSubScription(symbol); 
    if (subscription) {
        // Send the orderbook data to all subscribers of that symbol
        subscription.subscribers.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(orderbook)); // Send orderbook as a string
            }
        });
    }
}

async function popFromQueue() {
    while (true) { 
        const orderbook = await client.blPop('stockSymbol', 0);
        if (orderbook) {
           const parsedData = JSON.parse(orderbook.element);
           const symbol = parsedData.symbol;
           const data = parsedData.orderbook;
           await sendOrderbookData(symbol, data); // Pass symbol and orderbook data
        }
    }
}

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to redis");
        popFromQueue(); // Start polling the Redis queue
    } catch (error) {
        console.error(error);
    }

    server.listen(3001, () => {
        console.log("Server is running on port 3001"); // WebSocket server is listening on port 3001.
    });
}

startServer();
