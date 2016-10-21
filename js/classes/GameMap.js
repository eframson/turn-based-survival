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

	this.cellArray[this.startRow][this.startCol].improvement_type = "hq";
	this.cellArray[this.startRow][this.startCol].improvement_level = 1;
	this.cellArray[this.startRow][this.startCol].improvement_hp = 100;

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

GameMap.prototype.updateCell = function(cellRow, cellCol, newData, clearUnusedKeys, addNewKeys){

	clearUnusedKeys 	= $Utils.setDefaultValue(clearUnusedKeys, 0);
	addNewKeys 			= $Utils.setDefaultValue(addNewKeys, 1);
	var current 		= this.cellArray[cellRow][cellCol];
	var missingProps	= [];

	for (existingProp in current){
		if( newData[existingProp] != undefined ){
			current[existingProp] = newData[existingProp];
			delete newData[existingProp];
		}else{
			missingProps.push(existingProp);
		}
	}

	if(clearUnusedKeys){
		$.each( missingProps, function(idx, missingProp){
			delete current[missingProp];
		});
	}

	if(addNewKeys){
		for (newProp in newData){
			current[newProp] = newData[newProp];
		}
	}

	this.cellArray[cellRow][cellCol] = current;
	return this.rows();
}