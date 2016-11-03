/* global game */

var RemotePlayer = function (index, game, player, startX, startY, startAngle, role) {
  var x = startX
  var y = startY
  var angle = startAngle

  this.game = game
  this.player = player
  this.alive = true

  if (role === "fish"){
    this.player = game.add.sprite(x, y, 'fish')
    this.player.tint = 0x5dbaf5;
    this.player.alpha = 0.9;
  }else if  (role === "shark"){
    this.player = game.add.sprite(x, y, 'shark')
  }

  this.player.anchor.setTo(0.5, 0.5)
  this.player.animations.add('right', [0,1,2,3,4,5], 10, true);



  this.player.name = index.toString()
  game.physics.enable(this.player, Phaser.Physics.ARCADE)
  this.player.body.immovable = true
  this.player.body.collideWorldBounds = true

  // this.player.angle = angle

  this.lastPosition = { x: x, y: y, angle: angle }


}

RemotePlayer.prototype.update = function () {
  this.player.play('right')

  this.lastPosition.x = this.player.x
  this.lastPosition.y = this.player.y
  this.lastPosition.angle = this.player.scale.x
}

window.RemotePlayer = RemotePlayer
