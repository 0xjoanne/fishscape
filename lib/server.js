var util = require('util');
var http = require('http');
var path = require('path');
var ecstatic = require('ecstatic');
var io = require('socket.io')();

var Player = require('./Player');

var port = process.env.PORT || 8080;

/* ************************************************
** GAME VARIABLES
************************************************ */
var socket;	// Socket controller
var players;	// Array of connected players
var users;

var count = 6;
var myInterval;

var timerInterval;


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
  client.on('join game', onJoinGame);

  // Listen for get user info message
  client.on('get users', onGetUsers);

  // Listen for get user info message
  client.on('kill player', onKillPlayer);

  // Listen for display game timer
  client.on('display game timer', onDisplayGameTimer);

}

function onJoinGame(data){

  users.push(data);

  io.emit('display players', users);

  if(users.length == 3){
    onCountDown();
  }
}

function onGetUsers(){
  io.emit('display players', users);
}

function onCountDown(){
  myInterval = setInterval(function(){
    if (count <= 0) {
      clearInterval(myInterval);
    }
    io.emit('display count down', count);
    count--;
    if (count < 0){
      onAssignRole();
    }
  }, 1000);
}

function onDisplayGameTimer(data){
  clearInterval(timerInterval);
  timerInterval = setInterval(function(){
    if (data.timer <= 0) {
      clearInterval(timerInterval);
      io.emit('time up', users);
    }
    io.emit('display game timer', data.timer);
    data.timer--;
  }, 1000);
}

function onAssignRole(){
  var num = Math.floor(Math.random() * users.length);
  for (var i = 0; i < users.length; i++) {
    if (i == num){
      users[i].role = "shark";
    }
  }

  io.emit('display role', users);
}


// Socket client has disconnected
function onClientDisconnect () {
  util.log('Player has disconnected: ' + this.id);

  var removeUser = userById(this.id);
  users.splice(users.indexOf(removeUser), 1);
  this.broadcast.emit('display players', users);
  if(users.length < 3){
    count = 6
    io.emit('hide count down', count);
    clearInterval(myInterval);
  }

  var removePlayer = playerById(this.id);

  // Player not found
  if (!removePlayer) {
    util.log('Player not found: ' + this.id);
    return
  }

  // Remove player from players array
  players.splice(players.indexOf(removePlayer), 1);

  // Broadcast removed player to connected socket clients
  this.broadcast.emit('remove player', {id: this.id});

}

// New player has joined
function onNewPlayer (data) {
  // Create a new player
  var newPlayer = new Player(data.x, data.y, data.angle, data.role);
  newPlayer.id = this.id;

  // Broadcast new player to connected socket clients
  this.broadcast.emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), angle: newPlayer.getAngle(), role: newPlayer.getRole()});


  // Send existing players to the new player
  var existingPlayer;
  for (var i = 0; i < players.length; i++) {
    existingPlayer = players[i];
    this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY(), angle: existingPlayer.getAngle(), role: existingPlayer.getRole()});
  }

  // Add new player to the players array
  players.push(newPlayer)
}

// Player has moved
function onMovePlayer (data) {
  // Find player in array
  var movePlayer = playerById(this.id)

  // Player not found
  if (!movePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Update player position
  movePlayer.setX(data.x)
  movePlayer.setY(data.y)
  movePlayer.setAngle(data.angle)

  // Broadcast updated position to connected socket clients
  this.broadcast.emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY(), angle: movePlayer.getAngle()})
}

function onKillPlayer(data){

  var removePlayer = playerById(data.id);

  // Player not found
  if (!removePlayer) {
    util.log('Player not found: ' + data.id);
    return
  }
  players.splice(players.indexOf(removePlayer), 1);
  io.emit('kill player', {id: data.id});

  // all fishes died
  if(players.length == 1){
    clearInterval(timerInterval);
    io.emit('game over');
  }

}

/* ************************************************
** GAME HELPER FUNCTIONS
************************************************ */
// Find player by ID
function playerById (id) {
  for (var i = 0; i < players.length; i++) {
    if (players[i].id === id) {
      return players[i]
    }
  }

  return false
}

function userById (id) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      return users[i]
    }
  }

  return false
}
