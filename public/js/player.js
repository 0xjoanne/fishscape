$(document).ready(function(){
  // init socket
  var socket = io();

  // create a player object
  var player = {};


  $('#join-btn').on('click', function(event) {
    event.preventDefault();

    if($('#username').val()){

      // // store the player name in player object
      player.name = $('#username').val();

      //store a unique socket id for player
      player.id = socket.id;

      //player role is equal to fish
      player.role = 'fish';

      //send player object to server
      socket.emit('join game', player);

      //call the next screen that shows the players
      loadPregame();
    }

    $(this).prop('disabled', true);

  });

  socket.on('display players', function(players){

    // clear the players list
    $('#players-list').html('');

    //print all the players names and id's
    $.each(players, function(index, el) {
      //list out all players to players list screen
      $('<li>').text( el.name ).appendTo($('#players-list')).addClass('players-list__item');

    });
  })

  socket.on('display count down', function(count){
    if (count == 6){
      $('.countdown').show();
    }
    $('.countdown__number span').text(count);
  })

  socket.on('display role', function(players){
    window.localStorage.clear();
    loadRole(players);

    setTimeout(function(){
      window.location.href = "game.html";
    },2000);
  })

  //ajax call for second screen
  function loadPregame(){
    $.ajax({
      url: 'template/pregame.html'
    }).done(function(response){
      if($('#main').html() != response){
        $('#content').fadeOut(200, function(){
          $('#main').html(response);
          socket.emit('get users');
        })
      }
    }).fail(function() {
      console.log("error");
    }).always(function() {
      console.log("complete");
    });
  };

  function loadRole(players){
    $.ajax({
      url: 'template/role.html'
    }).done(function(response){
      if($('#main').html() != response){
        $('#content').fadeOut(200, function(){
          $('.countdown').hide();
          $('#main').html(response);
          localStorage.setItem('players',JSON.stringify(players));
          $.each(players, function(index, el) {
            if(el.id == socket.id){
              localStorage.setItem('currentPlayer',JSON.stringify(el));
              if(el.role === "fish"){
                $('.role-text').text("You are fish");
                $('.role-img').attr('src', '/assets/fish-right.png');
              }else{
                $('.role-text').text("You are shark");
                $('.role-img').attr('src', '/assets/shark-right.png');
              }
            }

          });
        })
      }
    }).fail(function() {
      console.log("error");
    }).always(function() {
      console.log("complete");
    });
  }

})
