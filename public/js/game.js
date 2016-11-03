/* global Phaser RemotePlayer io */

var socket; // Socket connection

var player;
var enemies;

var cursors;
var button;

var counter = 30;
var text = 0;

var game = new Phaser.Game(1024, 543, Phaser.AUTO);

var storedPlayers = JSON.parse(localStorage.getItem("players"));
var currentPlayer = JSON.parse(localStorage.getItem("currentPlayer"));

var playState = {
  preload: function(){
    game.load.image('background', 'assets/background.jpg');
  	game.load.image('star', 'assets/star.png');
    game.load.spritesheet('fish', 'assets/spritesheet.png', 104, 66);
    game.load.spritesheet('shark', 'assets/shark-spritesheet.png', 125, 75);
  },

  create: function(){
    socket = io.connect();

    // Create some baddies to waste :)
    enemies = [];

    //  Add background
    game.add.sprite(0, 0, 'background');

    // The base of our player
    var startX = Math.round(Math.random() * 1024);
    var startY = Math.round(Math.random() * 543);
    if(currentPlayer.role === "fish"){
      player = game.add.sprite(startX, startY, 'fish');
    }else{
      player = game.add.sprite(startX, startY, 'shark');
    }

    player.anchor.setTo(0.5, 0.5);
    player.animations.add('right', [0,1,2,3,4,5], 10, true);

    // This will force it to decelerate and limit its speed
    game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.collideWorldBounds = true;

    player.bringToTop();

    cursors = game.input.keyboard.createCursorKeys();

    // Start listening for events
    setEventHandlers();


    // add timer
    text = game.add.text(70, 40, 'Timer: 30s', { font: "20px Arial", fill: "#000000", align: "center" });
    text.anchor.setTo(0.5, 0.5);

    game.time.events.loop(Phaser.Timer.SECOND, this.updateCounter, this);
  },

  update: function(){
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) {
        enemies[i].update()
        if(currentPlayer.role === "shark"){
          game.physics.arcade.overlap(player, enemies[i].player, this.eatFish);
        }
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


    socket.emit('move player', { x: player.x, y: player.y, angle: player.scale.x });
  },

  eatFish: function(player, enemy){
    enemy.kill();
    socket.emit('kill player', { id: enemy.name});
  },

  updateCounter: function(){
    if(counter <= 0){
      var gameOverText = game.add.text(game.world.centerX - 150, game.world.centerY-30, 'Game Over', { font: "64px Arial", fill: "#ffffff", align: "center" });
      gameOverText.bringToTop();
    }else{
      counter--;
      text.setText('Timer: ' + counter + 's');
    }
  }
}

var setEventHandlers = function () {
  // Socket connection successful
  socket.on('connect', onSocketConnected);

  // Socket disconnection
  socket.on('disconnect', onSocketDisconnect);

  // New player message received
  socket.on('new player', onNewPlayer);

  // Player move message received
  socket.on('move player', onMovePlayer);

  // Player removed message received
  socket.on('remove player', onRemovePlayer);

  // Player removed message received
  socket.on('kill player', onKillPlayer);

}


// Socket connected
function onSocketConnected () {
  console.log('Connected to socket server');

  // Reset enemies on reconnect
  enemies.forEach(function (enemy) {
    enemy.player.kill();
  })
  enemies = [];

  // Send local player data to the game server
  socket.emit('new player', { x: player.x, y: player.y, angle: player.scale.x, role: currentPlayer.role});
}

// Socket disconnected
function onSocketDisconnect () {
  console.log('Disconnected from socket server');
}

// New player
function onNewPlayer (data) {
  console.log('New player connected:', data.id);

  // Avoid possible duplicate players
  var duplicate = playerById(data.id);
  if (duplicate) {
    console.log('Duplicate player!');
    return
  }

  // Add new player to the remote players array
  enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y, data.angle, data.role));

}

// Move player
function onMovePlayer (data) {
  var movePlayer = playerById(data.id);

  // Player not found
  if (!movePlayer) {
    console.log('Player not found: ', data.id);
    return
  }

  // Update player position
  movePlayer.player.x = data.x;
  movePlayer.player.y = data.y;
  movePlayer.player.scale.x = data.angle;
}

// Remove player
function onRemovePlayer (data) {
  var removePlayer = playerById(data.id);

  // Player not found
  if (!removePlayer) {
    console.log('Player not found: ', data.id);
    return
  }
  console.log(removePlayer);
  removePlayer.player.kill()

  // Remove player from array
  enemies.splice(enemies.indexOf(removePlayer), 1);
}

//
function onKillPlayer (data) {
  var removePlayer = playerById(data.id);

  // Player not found
  if (!removePlayer) {
    player.kill();
  }else{
    removePlayer.player.kill()

    // Remove player from array
    enemies.splice(enemies.indexOf(removePlayer), 1);
  }
}

// Find player by ID
function playerById (id) {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].player.name === id) {
      return enemies[i];
    }
  }

  return false;
}


game.state.add('play', playState);
game.state.start('play');
