
'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;

const server = express().listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

var users = {};
let i = 100000;
var player = [];

function randomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let getPlane = () => {
    let array = [];
    for (let j = 0; j < 20; j++) {
        array.push(randomNumber(100, 500));
    }
    return array;
}

wss.on('connection', (ws) => {
    //console.log('Client connected');
    users[i] = {
        "messageType": null,
        "myID": i,
        "otherID": null,
        "plane": null,
        "getWS": ws,
        "accepted": false,
        "isPlaying": false,
        "message": null,
        "playingID": null
    }

    ws.send(JSON.stringify({
        "messageType": "myID",
        "myID": i
    }));

    i++;


    ws.on('message', function (message) {
        //console.log(message);
        try { var obj = JSON.parse(message); } catch (error) {
            ws.send(JSON.stringify({
                "messageType": "UNCORRECTDATA"
            }));
            obj = null;
        }

        if (!users[obj.otherID]) {

        }

        // Sending request to other user
        else if (!users[obj.otherID].accepted && (obj.messageType == "REQUEST")) {
            if (users[obj.otherID].isPlaying) ws.send(JSON.stringify({
                "messageType": "INMATCH"
            }));

            else if (obj.otherID == null) ws.send(JSON.stringify({
                "messageType": "NOPLAYERID"
            }));
            else if (!obj.myID) ws.send(JSON.stringify({
                "messageType": "NOUSERID"
            }));
            else {
                users[obj.myID].otherID = obj.otherID;
                users[obj.otherID].getWS.send(JSON.stringify({
                    "messageType": "REQUESTED",
                    "otherID": obj.myID
                }));
            }
        }

        // Sending response to other user
        else if (obj.messageType == "ACCEPT") {
            if (obj.otherID == null) ws.send(JSON.stringify({
                "messageType": "NOPLAYERID"
            }));
            else if (!obj.myID) ws.send(JSON.stringify({
                "messageType": "NOUSERID"
            }));
            else if (obj.myID != users[obj.otherID].otherID) ws.send(JSON.stringify({ "messageType": "Wrong Player" }));
            else {
                users[obj.myID].otherID = obj.otherID;
                users[obj.myID].accepted = true;
                users[obj.myID].isPlaying = true;

                users[obj.otherID].otherID = obj.myID;
                users[obj.otherID].isPlaying = true;
                users[obj.otherID].accepted = true;

                player.push([obj.otherID, obj.myID]);

                users[obj.myID].playingID = player.length - 1;
                users[obj.otherID].playingID = player.length - 1;

                let planes = getPlane();
                let stars = getPlane();

                users[obj.otherID].getWS.send(JSON.stringify({
                    "messageType": "ACCEPTED",
                    "accepted": true,
                    "plane": planes,
                    "star": stars
                }));

                ws.send(JSON.stringify({
                    "messageType": "ACCEPTED",
                    "accepted": true,
                    "plane": planes,
                    "star": stars
                }));
            }
        }

        // if cancelled
        else if (obj.messageType == "REJECT") {
            if (obj.otherID == null) ws.send(JSON.stringify({
                "messageType": "NOPLAYERID"
            }));
            else if (!obj.myID) ws.send(JSON.stringify({
                "messageType": "NOUSERID"
            }));
            else {
                users[obj.otherID].otherID = null;
                users[obj.otherID].accepted = false;
                users[obj.otherID].isPlaying = false;
                users[obj.otherID].getWS.send(JSON.stringify({ "messageType": "REJECTED" }));
            }
        }

        // If both are ready then they can send message to each other
        else if (users[obj.otherID].otherID == obj.myID && users[obj.myID].accepted && users[obj.otherID].accepted) {
            // if LOST
            if (obj.messageType == "LOST") {
                //console.log("LOSE")
                users[obj.otherID].getWS.send(
                    JSON.stringify({
                        "messageType": "WIN",
                    })
                )
                users[obj.myID].otherID = null;
                users[obj.myID].isPlaying = false;
                users[obj.myID].accepted = false;
                player.pop(users[obj.myID].playingID);
            }

            // if KEYSTROKE
            else if (obj.messageType == "KEYSTROKE") {
                //console.log("KEYSTROKE")
                let other = obj.otherID.trim();
                users[obj.otherID].getWS.send(
                    JSON.stringify({
                        "messageType": "KEYSTROKE",
                    })
                )
            }

            // if MESSAGE
            else if (obj.messageType == "MESSAGE") {
                
                users[obj.otherID].getWS.send(
                    JSON.stringify({
                        "messageType": "MESSAGE",
                        "message": obj.message
                    })
                )
            }

            else {
                ws.send("NULL")
            }
        }

        // if WON
        if (obj.messageType == "WON") {
            //console.log("WON")
            users[obj.myID].otherID = null;
            users[obj.myID].isPlaying = false;
            users[obj.myID].accepted = false;
        }

    })

    ws.on('close', () => {
        for (let j = 100000; j < i; j++) {

            if (users[j] && users[j].getWS == ws) {
                // if it was matching with player
                if (users[j].isPlaying) {
                    let otherUser = users[j].otherID;
                    try {
                        users[otherUser].getWS.send(
                            JSON.stringify({
                                "messageType": "WIN",
                            })
                        )
                    }
                    catch (err) { }
                    player.pop(users[j].playingID);
                    //console.log("Player Group Removed");
                }
                //console.log("Client Disconnected " + j);
                delete users[j];
            }
        }
    });
});

setInterval(function () {
    for (let k = 0; k < player.length; k++) {
        try {
            users[player[k][0]].getWS.send(JSON.stringify({
                "messageType": "START",
            }))
            users[player[k][1]].getWS.send(JSON.stringify({
                "messageType": "START",
            }))
        }
        catch (err) { }
    }
}, 3000);

// sending enemy planes at 7 second interval
setInterval(function () {
    for (let k = 0; k < player.length; k++) {
        let planes = getPlane();
        let stars = getPlane();
        try {
            users[player[k][0]].getWS.send(JSON.stringify({
                "messageType": "PLANE",
                "plane": planes,
                "star":stars
            }))
            users[player[k][1]].getWS.send(JSON.stringify({
                "messageType": "PLANE",
                "plane": planes,
                "star":stars
            }))
        }
        catch (err) { }
    }
}, 7000)

