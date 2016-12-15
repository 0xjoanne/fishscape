var util = require('util');
var http = require('http');
var path = require('path');
var ecstatic = require('ecstatic');
var io = require('socket.io')();
var logger = require('tracer').colorConsole();

var Player = require('./Player');

var port = process.env.PORT || 8081;

/* ************************************************
** GAME VARIABLES
************************************************ */
var socket;	// Socket controller
var players;	// Array of connected players
var users;
var rounds = [];

var count;
var myInterval;

var timerInterval;

var room = 'room';
var roomCount = 0;
var roomName;



/* ************************************************
** GAME INITIALISATION
************************************************ */

// Create and start the http server
var server = http.createServer(
  ecstatic({ root: path.resolve(__dirname, '../public'), cache:1})
).listen(port, function (err) {
  if (err) {
    throw err
  }

  init()
})

function init () {
  // Create an empty array to store players
  players = [];

  users = [];

  // Attach Socket.IO to server
  socket = io.listen(server);

  // Start listening for events
  setEventHandlers();
}

/* ************************************************
** GAME EVENT HANDLERS
************************************************ */
var setEventHandlers = function () {
  // Socket.IO
  socket.sockets.on('connection', onSocketConnection);
}

// New socket connection
function onSocketConnection (client) {
  util.log('New player has connected: ' + client.id);

  // Listen for client disconnected
  client.on('disconnect', onClientDisconnect);

  // Listen for new player message
  client.on('new player', onNewPlayer);

  // Listen for move player message
  client.on('move player', onMovePlayer);

  // Listen for user join game message
  client.on('join game', function(data){
    roomName = room + roomCount;

    client.join(roomName);

    io.in(roomName).emit('get roomid', roomCount);

    users.push(data);

    logger.log(users);

    io.emit('display players', users);

    if(users.length == 3){
      onCountDown();
    }
  });

  // Listen for get user info message
  client.on('get users', onGetUsers);

  // Listen for get user info message
  client.on('kill player', onKillPlayer);

  // Listen for display game timer
  client.on('display game timer', onDisplayGameTimer);

}

function onCountDown(){
  count = 6;
  myInterval = setInterval(function(){
    if (count <= 0) {
      clearInterval(myInterval);
      onAssignRole();
      roomCount++;
    }
    io.emit('display count down', count);
    count--;
  }, 1000);
}

function onGetUsers(){
  io.emit('display players', users);
}

function onAssignRole(){
  var num = Math.floor(Math.random() * users.length);
  for (var i = 0; i < users.length; i++) {
    if (i == num){
      users[i].role = "shark";
    }
  }

  io.in(roomName).emit('display role', users);

  users = [];
}

// Socket client has disconnected
function onClientDisconnect(){
  util.log('Player has disconnected: ' + this.id);

  var removeUser = userById(this.id);
  users.splice(users.indexOf(removeUser), 1);
  this.broadcast.emit('display players', users);
  if(users.length < 3){
    io.emit('hide count down');
    clearInterval(myInterval);
  }

  var removePlayer = playerById(this.id);
  var roomId = removePlayer.room_id;
  var tmpName = room + roomId;
  // Player not found
  if (!removePlayer) {
    logger.log('Player not found: ' + this.id);
    return
  }

  // Remove player from players array
  if(players[roomId]){
    players[roomId].splice(players[roomId].indexOf(removePlayer), 1);
  }

  // Broadcast removed player to connected socket clients
  this.broadcast.to(tmpName).emit('remove player', {id: this.id});

}

// New player has joined
function onNewPlayer(data) {

  // Create a new player
  var newPlayer = new Player(data.x, data.y, data.angle, data.role);
  newPlayer.id = this.id;

  // Broadcast new player to connected socket clients
  var roomId = data.room_id;
  var tmpName = room + roomId;
  this.broadcast.to(tmpName).emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), angle: newPlayer.getAngle(), role: newPlayer.getRole()});

  if(!players[roomId]){
    players[roomId] = [];
  }

  // Send existing players to the new player
  var existingPlayer;
  for (var i = 0; i < players[roomId].length; i++) {
    existingPlayer = players[roomId][i];
    this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY(), angle: existingPlayer.getAngle(), role: existingPlayer.getRole()});
  }

  // Add new player to the players array
  players[roomId].push(newPlayer);
}


// Player has moved
function onMovePlayer(data) {
  var roomId = data.room_id;
  var tmpName = room + roomId;

  // Find player in array
  var movePlayer = playerById(this.id);

  if(movePlayer){
    //Update player position
    movePlayer.setX(data.x);
    movePlayer.setY(data.y);
    movePlayer.setAngle(data.angle);

    // Broadcast updated position to connected socket clients
    this.broadcast.to(tmpName).emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY(), angle: movePlayer.getAngle()})
  }

}

function onKillPlayer(data){
  var roomId = data.room_id;
  var tmpName = room + roomId;

  var removePlayer = playerById(data.id);

  // Player not found
  if (!removePlayer) {
    logger.log('Player not found: ' + data.id);
    return
  }

  players[roomId].splice(players[roomId].indexOf(removePlayer), 1);
  io.in(tmpName).emit('kill player', {id: data.id});

  // all fishes died
  if(players[roomId].length == 1){
    clearInterval(timerInterval);
    io.in(tmpName).emit('game over');
  }

}

function onDisplayGameTimer(data){
  var roomId = data.room_id;
  var tmpName = room + roomId;

  if(!rounds[roomId]){
    rounds[roomId] = [];
  }

  if(players[roomId]){
    rounds[roomId].push(players[roomId].length);
  }

  clearInterval(timerInterval);
  timerInterval = setInterval(function(){
    if (data.timer <= 0) {
      clearInterval(timerInterval);

      var isFinalRound;
      if(rounds[roomId].length){
        var lastValue = rounds[roomId].length - 1;
        if(rounds[roomId][lastValue] == 2){
          isFinalRound = true;
        }else{
          isFinalRound = false;
        }
      }else{
        isFinalRound = false;
      }

      io.in(tmpName).emit('time up', isFinalRound);
    }
    io.in(tmpName).emit('display game timer', data.timer);
    data.timer--;
  }, 1000);
}

/* ************************************************
** GAME HELPER FUNCTIONS
************************************************ */
function checkFishLength(players){

}

// Find player by ID
function playerById (id) {
  for (var i = 0; i < players.length; i++) {
    for (var j = 0; j < players[i].length; j++){
      if (players[i][j].id == id) {
        return players[i][j]
      }
    }
  }

  return false
}

function userById (id) {
  for (var i = 0; i < users.length; i++){
    if (users[i].id === id) {
      return users[i]
    }
  }
  return false
}
