var $Utils = Utils.prototype;

/**
 * The game map
 * @constructor
 * @param {object} data - All the init data
 */
var GameMap = function(data) {
	this.init(data);
};

GameMap.prototype.init = function(data){

	var self = this;
	
	if(data == undefined){
		throw new Exception("Can not create empty map");
	}

	this.cellArray = data.cellArray;
}

GameMap.prototype.rows = function(){
	return this.cellArray;
}