//const BUILD_VERSION = 1459377890;
var game = undefined;

$(document).ready(function(){

	//Hide the loader gif and show the load/save controls now that everything's...well, loaded
	$("#loading").addClass("hidden");
	$(".save-load-controls").removeClass("hidden");
	
	//TEMPORARY:
	$(".player-stat-row").removeClass("hidden");

	//Sneakily switch our hidden elements to a jQuery hide/show instead of CSS class
	$(".hidden").hide().removeClass("hidden");

	game = new Game();
	ko.applyBindings(game);

	$(document).keydown(function(e){
		if(e.keyCode == 32){ //Space bar
			game.spcAction();
		} else if(e.keyCode == 107){ //Numpad +
			game.plusAction();
		} else if(e.keyCode == 109){ //Numpad -
			game.minusAction();
		}
	});

});

//http://usejsdoc.org/about-getting-started.html

/*
- Simulate birth/death rates

*/