//const BUILD_VERSION = 1459377890;
var game = undefined;

$(document).ready(function(){

	//Hide the loader gif and show the load/save controls now that everything's...well, loaded
	$("#loading").addClass("hidden");
	//$(".save-load-controls").removeClass("hidden");
	
	//TEMPORARY:
	//$(".player-stat-row").removeClass("hidden");

	//Sneakily switch our hidden elements to a jQuery hide/show instead of CSS class
	$(".hidden").hide().removeClass("hidden");

	game = new Game();
	ko.applyBindings(game);

	var hash = window.location.hash.substring(1);
	if(hash == "fastintro"){
		game.isDebugMode = 1;
	}

	$(document).keydown(function(e){
		if(e.keyCode == 32){ //Space bar
			e.preventDefault();
			game.spcAction();
		} else if(e.keyCode == 107){ //Numpad +
			game.plusAction();
		} else if(e.keyCode == 109){ //Numpad -
			game.minusAction();
		}
	});

	$('.collapse').collapse({
		toggle: false,
		parent: '#game-info-accordion'
	});

	$(document).on('click', '.panel-heading', function (e) {
		var $this = $(this);
		$this.siblings(".collapse").collapse('toggle');
	});

	$(document).on('mouseenter', '.panel-heading', function (e) {
		var $this = $(this);
		$this.addClass("hover");
	});

	$(document).on('mouseleave', '.panel-heading', function (e) {
		var $this = $(this);
		$this.removeClass("hover");
	});

	$(document).on('click', '#game-map .map-cell', function (e) {
		var $this = $(this);
		$('#game-map .map-cell.selected').removeClass('selected');
		$this.addClass('selected');
		$("#game-panel-cell-info .collapse").collapse("show");
	});

	$("button.btn").click(function(){
		this.blur();
	});

	$("#onecol-row").fadeIn(400);

});

//http://usejsdoc.org/about-getting-started.html