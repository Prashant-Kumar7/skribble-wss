import express from "express"
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "redis";
import { UserManager } from "./manager/UserManager";
import dotenv from "dotenv"


const app = express()

dotenv.config()

export const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: 'redis-14424.c83.us-east-1-2.ec2.redns.redis-cloud.com',
        port: 14424
    }
});

export const options = {
  method: 'GET',
  url: 'https://pictionary-charades-word-generator.p.rapidapi.com/charades',
  params: {difficulty: 'easy'},
  headers: {
    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    'x-rapidapi-host': 'pictionary-charades-word-generator.p.rapidapi.com'
  }
};


client.on('error', err => console.log('Redis Client Error', err));


const httpServer = app.listen(8080)

const wss = new WebSocketServer({ server: httpServer });

const users = new UserManager()

wss.on("connection" , async function connection(ws : WebSocket){
    users.addUser(ws)
    setInterval(()=>{
      wss.clients.forEach((socket)=>{
        socket.send(JSON.stringify({type : "ping"}))
      })
    },30000)
})


async function StartQueue(){
    try {
        await client.connect();
        console.log("ws connected to Redis.");
  
        // Main loop
        while (true) {
            try {
                const submission = await client.brPop("room", 0);
                if(submission){
  
                  const parsedMessage = JSON.parse(submission.element.toString())
                  if(parsedMessage.type === "JOIN"){
                    users.joinRoom(submission.element)
                  }
  
                  if(parsedMessage.type === "CREATE"){
                    users.createRoom(submission.element)
                  }
  
                }
  
                // users.redisQueue(submission)
            } catch (error) {
                console.error("Error processing submission:", error);
            }
        }
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
  }
  
  StartQueue()



