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
    array.push([800, randomNumber(100, 500)]);
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
    try{var obj = JSON.parse(message);} catch(error){
       ws.send(JSON.stringify({
      "messageType": "UNCORRECTDATA"
    }));
    obj = null;
  }
    if(obj == null) ws.send(JSON.stringify({
      "messageType": "NODATA"
    }))
    // This will check whether that player exist
    else if (!users[obj.otherID]) {
      ws.send(JSON.stringify(
        {
          "messageType": "NOUSER",
        }
      ));
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
        users[obj.myID].accepted = false;
        users[obj.myID].isPlaying = true;
        users[obj.otherID].getWS.send(JSON.stringify({
          "messageType": "REQUEST",
          "otherID": obj.myID
        }));
      }
    }
    
    // Sending response to other user
    else if (obj.messageType == "ACCEPTED") {
      if (obj.otherID == null) ws.send(JSON.stringify({
        "messageType": "NOPLAYERID"
      }));

      users[obj.otherID].getWS.send(JSON.stringify({
        "messageType": "RESPONSE",
        "accepted": true
      }));

      if (obj.myID == users[obj.otherID].otherID) ws.send("Wrong player ID was given during response");

      users[obj.myID].otherID = obj.otherID;
      users[obj.myID].accepted = true;
      users[obj.myID].isPlaying = true;

      users[obj.myID].accepted = true;

      player.push([obj.otherID, obj.myID]);

      users[obj.myID].playingID = player.length - 1;
      users[obj.otherID].playingID = player.length - 1;

      let planes = getPlane();
      users[obj.myID].plane = planes;
      users[obj.otherID].plane = planes;
    }

    // if cancelled
    else if (obj.messageType == "REJECT") {
      users[obj.otherID].send(JSON.stringify({ "messageType": "CANCEL"}))
    }

    // If both are ready then they can send message to each other
    else if (users[obj.otherID].otherID == obj.myID && users[obj.myID].accepted && users[obj.otherID].accepted) {
      // if WON
      if (obj.messageType == "WIN") {
        users[obj.myID].otherID = null;
        users[obj.myID].isPlaying = false;
        users[obj.myID].accepted = false;
      }

      // if LOST
      else if (obj.messageType == "LOST") {
        users[obj.otherID].getWS.send(
          JSON.stringify({
            "messageType": "LOST",
          })
        )
      }

      // if KEYSTROKE
      else if (obj.messageType == "KEYSTROKE") {
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
  })

  ws.on('close', () => {
    for (let j = 100000; j < i; j++) {

      if (users[j] && users[j].getWS == ws) {
        // if it was matchong with player
        if (users[j].isPlaying) {
          users[users[j].otherID].getWS.send(
            JSON.stringify({
              "messageType": "WIN",
            })
          )
          player.pop(users[j].playingID);
        }
        console.log("Client Disconnected " + j);
        delete users[j];
      }
    }
  });
});

// sending enemy planes at 7 second interval
setInterval(function () {
  for (let k = 0; k < player.length; k++) {
    let planes = getPlane();
    users[player[k][0]].getWS.send(JSON.stringify({
      "messageType": "PLANE",
      "plane": planes
    }))
    users[player[k][1]].getWS.send(JSON.stringify({
      "messageType": "PLANE",
      "plane": planes
    }))
  }
}, 7000)

