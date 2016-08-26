//const BUILD_VERSION = 1459377890;
var game = undefined;

$(document).ready(function(){

	//Hide the loader gif and show the load/save controls now that everything's...well, loaded
	$("#loading").addClass("hidden");
	$(".save-load-controls").removeClass("hidden");
	//Sneakily switch our hidden elements to a jQuery hide/show instead of CSS class
	$(".hidden").hide().removeClass("hidden");

	game = new Game();
	ko.applyBindings(game);

});