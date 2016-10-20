var $Utils = Utils.prototype;

/**
 * The game map
 * @constructor
 * @param {object} data - All the init data
 */
var GameMap = function(data) {
	this.startRow = -1;
	this.startCol = -1;
	this.cellArray = [];
	this.height = -1;
	this.width = -1;
	this.init(data);
};

GameMap.prototype.init = function(data) {

	var self = this;
	
	if(data == undefined){
		throw new Exception("Can not create empty map");
	}

	this.cellArray = data.cellArray;

	this.height = this.cellArray.length;
	this.width = this.cellArray[0].length;
}

GameMap.prototype.rows = function() {
	return this.cellArray;
}

GameMap.prototype.chooseRandomStart = function() {
	if(this.cellArray.length == 0){
		return false;
	}

	var cell = this.chooseRandomCell();
	while(cell.terrain_type != "grassland"){
		cell = this.chooseRandomCell();
	}
	this.startRow = cell.row;
	this.startCol = cell.column;

	this.cellArray[this.startRow][this.startCol].improvement = { type : "hq", level : 1, hp : 100 };

	return this.rows();
}

GameMap.prototype.chooseRandomCell = function() {
	if(this.cellArray.length == 0){
		return false;
	}

	return this.cellArray[$Utils.doRand(0, this.height)][$Utils.doRand(0, this.width)];
}

GameMap.prototype.distanceFromBase = function(cell) {
	var rowDiff = Math.abs(cell.row - this.startRow);
	var colDiff = Math.abs(cell.column - this.startCol);

	return Math.round((colDiff + rowDiff) / 2);
}