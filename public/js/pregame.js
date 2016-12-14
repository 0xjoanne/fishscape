$(document).ready(function(){

  // init socket
  // var socket = io();

  // create a player object
  var player = {};

  /**
   * Sign up
   */

  $('#join-btn').on('click', function() {
    signup();
  });

  // $('#username').keypress(function (e) {
  //   if (e.which == 13) {
  //     signup();
  //   }
  // });

  function signup(){
    if($('#username').val()){

      // store the player name in player object
      player.name = $('#username').val();

      //store a unique socket id for player
      player.id = socket.id;

      //player role is equal to fish
      player.role = 'fish';

      // player.room_id = roomId;

      //send player object to server
      socket.emit('join game', player);

      // disabled button
      $(this).prop('disabled', true);

      //call the next screen that shows the players
      loadPregame();

    }else{
      $('.info__label').text('please enter your username');
      setTimeout(function(){
        $('.info__label').text('enter username');
      }, 1000)
    }
  }

  /**
   * open tutorial
   */

  $('.tutorial-link').click(function(e){
    e.preventDefault();
    $('.tutorial-modal').fadeIn('slow');
    $('.mask').fadeIn('slow');
  })

  var windowHeight = $(window).height();
  var windowWidth = $(window).width();
  var boxHeight = $('.tutorial-modal').height();
  var boxWidth = $('.tutorial-modal').width();
  $('.tutorial-modal').css({'left' : ((windowWidth - boxWidth)/2), 'top' : ((windowHeight - boxHeight)/2)});

  $('.close-btn').click(function(e){
    e.preventDefault();
    $('.tutorial-modal').hide();
    $('.mask').hide();
  })

  $('.mask').click(function(){
    $('.tutorial-modal').hide();
    $('.mask').hide();
  })

  /**
   * ajax call for next screen
   */

  function loadPregame(){
    $.ajax({
      url: 'template/players-list.html'
    }).done(function(response){
      if($('#main').html() != response){
        $('#content').fadeOut(200, function(){
          $('#main').html(response);
          socket.emit('get users');
          console.log(roomId);
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
          $('#main').html(response);
          // localStorage.setItem('players', JSON.stringify(players));
          $.each(players, function(index, el) {
            if(el.id == socket.id){
              // localStorage.setItem('currentPlayer',JSON.stringify(el));
              currentPlayer = el;
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

  function loadGame(){
    $.ajax({
      url: 'template/game.html'
    }).done(function(response){
      if($('#main').html() != response){
        $('#content').fadeOut(200, function(){
          $(document.body).append(response);
        })
      }
    }).fail(function() {
      console.log("error");
    }).always(function() {
      console.log("complete");
    });
  }

  /**
   * Socket functions
   */

  socket.on('get roomid', function(data){
    roomId = data;
  })

  socket.on('display players', function(players){
    // clear the players list
    $('#players-list').html('');

    //print all the players names and id's
    $.each(players, function(index, el) {
      if(el.id == socket.id){
        //list out all players to players list screen
        $('<li>').text( el.name ).appendTo($('#players-list')).addClass('players-list__item highlight-color');
      }else{
        //list out all players to players list screen
        $('<li>').text( el.name ).appendTo($('#players-list')).addClass('players-list__item');
      }
    });
  })

  socket.on('display count down', function(count){
    if (count == 6 && $('#players-list').length){
      $('.countdown').show();
    }
    if($('#players-list').length == 0){
      $('.countdown').hide();
    }

    $('.countdown__number span').text(count);
  })

  socket.on('hide count down', function(){
    $('.countdown').hide();
  })

  socket.on('display role', function(players){
    // window.localStorage.clear();

    $('.countdown').hide();

    loadRole(players);

    setTimeout(function(){
      // window.location.href = "game.html";
      loadGame();
    },2000);
  })

})
