const express = require("express");
const axios = require('axios');

const path = require("path");
const PORT = process.env.PORT || 3001;
const app = express();

// Define middleware here
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Serve up static assets (usually on heroku)
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

// Define API routes here

// Send every other request to the React app
// Define any API routes before this runs
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`🌎 ==> API server now on port ${PORT}!`);
});





function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}


// set up socket.io from our express connection
var io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});
let hostsArr = [];


// handle incoming connections from clients
io.sockets.on('connection', function(socket) {
  
  console.log(socket.id)
  // sorting out room creation for hosts ... 
  // once a client has connected, we expect to get a ping from them saying what room they want to join
  socket.on('room', function(data) {
      if (data === 'create') {
          let roomName = makeid(4)
        
          socket.join(roomName)
          console.log('room message recieved:' + roomName)
          
          hostsArr.push({
            roomName: roomName,
            hostSocket: socket.id,
            userCount: 0,
            users: [],
            status: 'lobby'
          })

          // io.sockets.emit('getHosts', hostsArr)
          io.sockets.in(roomName).emit('room', { roomName })
          console.log('New host has been created')
          console.log('Current hosts list is:')
          console.log(JSON.stringify(hostsArr, null, 4))
      }
  });

  // join room, for joiners
  socket.on('joinRoom', function({ roomName, username, color }) {
    
    console.log('client join room message recieved:' + roomName)
    
    let roomFound = false;

    hostsArr.forEach(function(room) {
      if(room.roomName === roomName){
          roomFound = true;
          socket.join(roomName)
          if ( room.users.find(function(user) {return user.socket === socket.id}) === undefined ) {
            room.users.push({
                socket: socket.id, 
                username: username,
                color: color,
                score: 0
              })
              room.userCount++

              socket.to(room.hostSocket).emit('roomStatus', room)
              
          }
      } 
    })

    if (!roomFound) {
      console.log('room not round')
      console.log(socket.id)
      socket.emit('status', {
        status: 'lobby', 
        statusMessage: 'Room not found!'
      })
    } else {
      socket.emit('status', {
        status: 'wait', 
        statusMessage: 'Waiting for game to start ...'
      })
    }

    console.log('message', `New user has joined ${roomName}.`)
    console.log('Hosts list after joiner:')
    console.log(JSON.stringify(hostsArr, null, 4))
  });


  // start the game - set question to 1 
  socket.on('startGame', function({roomName}) {

    hostsArr.forEach(function(room) {
        if(room.roomName === roomName){
          
            room.status = 'question'
            room.questionCount = 1
            room.answersRecieved = 0
            room.question = 'Who directed the film Terminator 2 ?'
            
            room.correct = "James Cameron"
            room.wrong = [
              "Steven Spielberg",
              "Ridley Scott"
            ]
            room.answers = [
              'Steven Spielberg',
              'James Cameron',
              'Ridley Scott',
              'Werner Herzog'
            ]

            // reset each user score to 0
            room.users.forEach(function(user) {
              user.score = 0,
              user.answer = null
            })

            room.users.forEach(function(user) {
              io.sockets.to(user.socket).emit('status', {
                status: 'question', 
                statusMessage: 'Please choose an answer ...',
                answers: room.answers
              })
            })

            io.sockets.to(room.hostSocket).emit('roomStatus', room)
            console.log(JSON.stringify(room, null, 4))
        }
    })
  })
  

    // start the game - set question to 1 
    socket.on('nextQuestion', function({roomName}) {




    
      hostsArr.forEach(function(room) {
          if(room.roomName === roomName){
              // console.log('in the function:')
              // console.log(incomingData)

              let data

              axios.get('https://opentdb.com/api.php?amount=1&type=multiple').then(res => { 
                data = res.data
                console.log(data.results[0].question)
              


              room.status = 'question'
              room.questionCount++
              room.answersRecieved = 0
              
              
              room.question = data.results[0].question
              
              room.correct = data.results[0].correct_answer
              room.wrong = data.results[0].incorrect_answers

        //shuffle correct answer into incorrect ones
        let answerList = [];

        answerList = room.wrong;
        randomNumber = (Math.floor(Math.random() * answerList.length ));
        answerList.splice(randomNumber, 0, room.correct);
        console.log(answerList);

              room.answers = answerList
  
              // reset user answers
              room.users.forEach(function(user) {
                user.answer = null
              })
  
              room.users.forEach(function(user) {
                io.sockets.to(user.socket).emit('status', {
                  status: 'question', 
                  statusMessage: 'Please choose an answer ...',
                  answers: room.answers
                })
              })
  
              io.sockets.to(room.hostSocket).emit('roomStatus', room)
              console.log(JSON.stringify(room, null, 4))
          
              }) // ending axios here lols
          
            }

        

      })
    })
    

  socket.on('playerAnswer', function({roomName, username, answer}) {
    console.log('got an answer')
    hostsArr.forEach(function(room) {
      if (room.roomName === roomName) {
        console.log('got room')

          room.users.forEach(function(user) {
            if (user.socket === socket.id && user.answer === null) {
              console.log('got user and null')
              user.answer = answer
              room.answersRecieved++
            }
          })

      }

      // if everyone has answered
      if (room.answersRecieved == room.userCount) {

        // evaluate each users answer
        room.users.forEach(function(user) {
          if (user.answer === room.correct ) {
            user.score++
            user.result = true
          } else {
            user.result = false
          }
        })
        
        // set game status to answer
        room.status = 'answer'
        io.sockets.to(room.hostSocket).emit('roomStatus', room)
        console.log(JSON.stringify(room, null, 4))

      }
    })
  })

  // start the game - set question to 1 
  // socket.on('nextQuestion', function({roomName}) {

  //   hostsArr.forEach(function(room) {
  //       if(room.roomName === roomName){
          
  //           room.questionCount++;
  //           // reset each user score to 0
  //           room.users.forEach(function(user) {
  //             user.score = 0
  //           })

  //           io.sockets.to(room.hostSocket).emit('roomStatus', room)
  //           console.log(JSON.stringify(room, null, 4))
  //       }
  //   })
  // })








  
  socket.on('removeUser', function(data) {
    console.log('passing removeUser message:');
    console.log(data);
    io.sockets.in(data.room).emit('removeUser', data.msg);
        for(let i=0; i < hostsArr.length; i++){
          for(let j=0; j < hostsArr[i].users.length; j++) {
              if (hostsArr[i].users[j] === socket.id) {
                console.log('a user has disconnected - the host has been notified REMOVE USER FUNC');

                socket.to(hostsArr[i].hostSocket).emit("removeUser", socket.id);    
                // We have already messaged, just want to remove from array!

                hostsArr[i].users.splice(j,1);
              }
          }
        }

        console.log(JSON.stringify(hostsArr, null, 4));
  });




// removeHost such as SYNTH component UNMOUNT. ie. Navigate away.
socket.on('removeHost', function() {
    
  console.log('Host has removed itself');

    for(let i=0; i < hostsArr.length; i++){         
        if(hostsArr[i].hostSocket === socket.id){
            io.sockets.in(hostsArr[i].room).emit('disconnectedHost', socket.id);
            hostsArr.splice(i,1); 
        }
    }

    // send everybody a message saying the host as disconnected
    
    io.sockets.emit('getHosts', hostsArr);
    console.log('host: ' + socket.id + ' has disconnected itself');
    console.log('Remaining hosts are:');
    console.log(JSON.stringify(hostsArr, null, 4));

});


  // on DISCONNECT or CLOSE TAB remove host from hosts list
  socket.on('disconnect', function(reason) {
    
    console.log('DISCONNECT');
    console.log(reason);

    let wasHost = false;

        for(let i=0; i < hostsArr.length; i++){  
            if(hostsArr[i].hostSocket === socket.id){
                  
                  console.log('a host has disconnected - the watchers have been notified DC FUNC HOST DC');
                  // msg each of the watchers
                  // for(let j=0; j < hostsArr[i].users.length; j++) {
                  //     socket.to(hostsArr[i].users[j]).emit("disconnectHost", socket.id);
                  // }


                  //msg everyone in room that host has dc'd
                  io.sockets.in(hostsArr[i].room).emit('disconnectedHost', socket.id);

                  wasHost = true;
                  hostsArr.splice(i,1); 
                  io.sockets.emit('getHosts', hostsArr);
            }
        }
        if (wasHost === false) {

            for(let i=0; i < hostsArr.length; i++){
                for(let j=0; j < hostsArr[i].users.length; j++) {
                    if (hostsArr[i].users[j] === socket.id) {
                      console.log('a user has disconnected - the host has been notified  DC FUNC USER DC');

                      socket.to(hostsArr[i].hostSocket).emit("removeUser", socket.id);
                      // io.sockets.in(hostsArr[i].room).emit('disconnectedUser', socket.id);
                      hostsArr[i].users.splice(j,1);
                      io.sockets.emit('getHosts', hostsArr);
                    }
                }
            }
        }

      
      // send everybody a message saying the host as disconnected
      // io.emit('exit', socket.id); 
      // io.sockets.emit('getHosts', hostsArr)
      // console.log(socket.id + ' has disconnected');
      console.log('Hosts array after removals:')
      console.log(JSON.stringify(hostsArr, null, 4))

      // socket.to(broadcaster).emit("disconnectPeer", socket.id);

  });





});

