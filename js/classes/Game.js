var Game = function(data) {
	this.init(data);
};

Game.prototype.init = function(data){
	data = data || {};

	this.settlers = ko.observableArray([]);
}