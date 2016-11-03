/* global Phaser RemotePlayer io */

var socket; // Socket connection

var player;
var enemies;

var cursors;
var button;

var game = new Phaser.Game(1024, 543, Phaser.AUTO, '', { preload: preload, create: create, update: update })

function preload () {
  game.load.image('background', 'assets/background.jpg');
	game.load.image('star', 'assets/star.png');
  game.load.spritesheet('fish', 'assets/spritesheet.png', 104, 66);
}

function create () {
  socket = io.connect();

  //  Add background
  game.add.sprite(0, 0, 'background');

  // The base of our player
  var startX = Math.round(Math.random() * 1024);
  var startY = Math.round(Math.random() * 543);
  player = game.add.sprite(startX, startY, 'fish')
  player.anchor.setTo(0.5, 0.5)
  player.animations.add('right', [0,1,2,3,4,5], 10, true);

  // This will force it to decelerate and limit its speed
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.body.collideWorldBounds = true

  // Create some baddies to waste :)
  enemies = []

  player.bringToTop()

  cursors = game.input.keyboard.createCursorKeys()

  // Start listening for events
  setEventHandlers()
}

var setEventHandlers = function () {
  // Socket connection successful
  socket.on('connect', onSocketConnected)

  // Socket disconnection
  socket.on('disconnect', onSocketDisconnect)

  // New player message received
  socket.on('new player', onNewPlayer)

  // Player move message received
  socket.on('move player', onMovePlayer)

  // Player removed message received
  socket.on('remove player', onRemovePlayer)

}

// Socket connected
function onSocketConnected () {
  console.log('Connected to socket server')

  // Reset enemies on reconnect
  enemies.forEach(function (enemy) {
    enemy.player.kill()
  })
  enemies = []

  // Send local player data to the game server
  socket.emit('new player', { x: player.x, y: player.y, angle: player.scale.x })
}

// Socket disconnected
function onSocketDisconnect () {
  console.log('Disconnected from socket server')
}

// New player
function onNewPlayer (data) {
  console.log('New player connected:', data.id)

  // Avoid possible duplicate players
  var duplicate = playerById(data.id)
  if (duplicate) {
    console.log('Duplicate player!')
    return
  }

  // Add new player to the remote players array
  enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y, data.angle))
}

// Move player
function onMovePlayer (data) {
  var movePlayer = playerById(data.id)

  // Player not found
  if (!movePlayer) {
    console.log('Player not found: ', data.id)
    return
  }

  // Update player position
  movePlayer.player.x = data.x
  movePlayer.player.y = data.y
  movePlayer.player.scale.x = data.angle
}

// Remove player
function onRemovePlayer (data) {
  var removePlayer = playerById(data.id)

  // Player not found
  if (!removePlayer) {
    console.log('Player not found: ', data.id)
    return
  }

  removePlayer.player.kill()

  // Remove player from array
  enemies.splice(enemies.indexOf(removePlayer), 1)
}

function update () {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive) {
      enemies[i].update()
      // game.physics.arcade.collide(player, enemies[i].player)
    }
  }

  player.body.velocity.x = 0;
  player.body.velocity.y = 0;
  player.animations.play('right');
  player.bringToTop();

  if (cursors.left.isDown){
      player.body.velocity.x = -200;
      player.scale.x = -1;
  }else if (cursors.right.isDown){
      player.body.velocity.x = 200;
      player.scale.x = 1;
  }else if (cursors.up.isDown){
      player.body.velocity.y = -200;
  }else if (cursors.down.isDown){
      player.body.velocity.y = 200;
  }


  socket.emit('move player', { x: player.x, y: player.y, angle: player.scale.x })
}

// Find player by ID
function playerById (id) {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].player.name === id) {
      return enemies[i]
    }
  }

  return false
}
