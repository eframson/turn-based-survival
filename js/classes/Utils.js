/**
 * Collection of utility methods (STATIC)
 * @constructor
 */
var Utils = function() {
	throw Exception("Utils should not be instantiated");
};

Utils.prototype.setDefaultValue = function(param, defaultValue){
	return (param != undefined) ? param : defaultValue ;
}

Utils.prototype.pushOntoArray = function(targetArray, valToPush){
	if ( typeof targetArray == 'undefined' || !(targetArray instanceof Array) ) {
		targetArray = [];
	}
	targetArray.push(valToPush);
	return targetArray;
}

//Generate a number between min (inclusive) and max (exclusive)
Utils.prototype.doRand = function(min, max){
	return Math.floor(Math.random() * (max - min)) + min;
}

Utils.prototype.doBasedOnPercent = function(percentageActions, finallyAction){
	var percents;
	if(percentageActions == undefined){
		return false;
	}

	var discretePercents = Object.keys(percentageActions);
	var percents = Array();

	for(i = 0; i < discretePercents.length; i++){

		if( percentageActions[discretePercents[i]].constructor == Array ){

			for(j=0; j < percentageActions[discretePercents[i]].length; j++){
				percents.push(discretePercents[i]);
			}

		}else{
			percents.push(discretePercents[i]);
		}

	}

	percents.sort();
	
	var rand = this.doRand(1,101);
	var percentOffset = 0;
	
	for(i = 0; i < percents.length; i++){

		var targetPercentage = parseInt(percents[i]);
		var addToPercentOffset = parseInt(targetPercentage);

		if( (rand - percentOffset) <= percents[i] ){

			var chosenAction = percentageActions[percents[i]];

			if( chosenAction.constructor == Array ){

				var numPossibilities = chosenAction.length;
				var whichPossibilityIndex = this.doRand(0,numPossibilities);
				chosenAction = chosenAction[whichPossibilityIndex];

			}

			if(typeof chosenAction === 'function'){
				return chosenAction(rand);
			}else{
				return chosenAction;
			}

		}else{
			percentOffset += addToPercentOffset;
		}
	}
	
	if(finallyAction && typeof finallyAction === 'function'){
		return finallyAction(rand);
	}
	
	return false;
}

Utils.prototype.chooseRandomly = function(optArray){
	var randIdx = this.doRand(0, optArray.length);
	return optArray[randIdx];	
}