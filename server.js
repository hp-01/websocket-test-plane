var express = require("express")
var http = require("http")
var WebSocket = require("ws")

var app = express()
var server = http.createServer(app)

const wss = new WebSocket.Server({server})

var users = {}
var i = 100000;

wss.on('connection', function (ws,req) {
    users[i] = ws
    ws.on('message',function(message){
        var obj = JSON.parse(message)
        console.log("received "+obj.other)
        if(users[obj.other])
        {
        users[obj.other].send('Hello broadcast message '+ obj.msg)
        ws.send("Sent to user "+obj.other)
        }
        else
        {
            ws.send("User is not Connected")
        }
    })

    ws.send("Hi there I am a WebSocket Server and your ID"+i)
    i++
})

server.listen(8999,function(){
    console.log("Server port "+server.address().port)
})

