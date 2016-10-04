var $Utils = Utils.prototype;

var Game = function(data) {
	this.init(data);
};

Game.prototype.init = function(data){

	var self = this;
	data = data || {};

	//Static properties
	this.availableLeaders = [
		{
			id : "sterling",
			name : "Sterling",
			bio : "",
		},{
			id : "gunter",
			name : "Günter",
			bio : "",
		},{
			id : "les",
			name : "Lesli",
			bio : "",
		}
	];
	this.seasons = [
		'Spring',
		'Summer',
		'Fall',
		'Winter',
	];

	//Regular properties
	this.timer;
	this.hourCounter = 1;
	this.dayCounter = 1;	
	this.seasonCounter = 0;
	this.yearCounter = 1;
	this.currentHour = 1;
	this.currentDay = 1;
	this.currentSeason = this.seasons[this.seasonCounter % 4];
	this.isPlaying = 0;
	this.timerInterval = 1000;
	this.isPopupVisible = 0;
	this.hourlyEvents = {};
	this.dailyEvents = {};
	this.seasonalEvents = {};
	this.yearlyEvents = {};
	this.dailyMealsDesired = data.dailyMealsDesired || 0;
	this.dailyMealsServed = data.dailyMealsServed || 0;
	this.lowFoodDaysCount = data.lowFoodDaysCount || 0;
	this.starvationMarkers = data.starvationMarkers || 0;
	this.isGameOver = data.isGameOver || 0;
	this.scheduledChildAgingEvents = data.scheduledChildAgingEvents || { 7 : 1 };
	this.scheduledAdultAgingEvents = data.scheduledAdultAgingEvents || { 9 : 1, 12 : 1, 16 : 1 };
	this.scheduledDeathEvents = data.scheduledAgingEvents || { 22 : 1 };

	//Observables
	this.availableSettlers = ko.observable( $Utils.setDefaultValue(data.availableSettlers, 5) );
	this.workingSettlers = ko.observable(data.workingSettlers || 0);
	this.busySettlers = ko.observable(data.busySettlers || 0);
	this.childSettlers = ko.observable( $Utils.setDefaultValue(data.childSettlers, 1) );
	this.adultSettlers = ko.observable( $Utils.setDefaultValue(data.adultSettlers, 1) );
	this.oldSettlers = ko.observable( $Utils.setDefaultValue(data.oldSettlers, 1) );
	this.resources = ko.observable(data.resources || this._getDefaultResources());
	this.playSpeed = ko.observable(1);
	this.mapArray = ko.observable([]);

	//Computed
	this.totalSettlers = ko.computed(function(){
		return (self.availableSettlers() || 0) + (self.workingSettlers() || 0) + (self.busySettlers() || 0);
	});


	//Init behavior
	document.getElementById("current-hour").innerHTML = this.currentHour;
	document.getElementById("current-day").innerHTML = this.currentDay;
	document.getElementById("current-season").innerHTML = this.currentSeason;
	document.getElementById("current-year").innerHTML = this.yearCounter;

	this._setupDefaultTimeEvents();

	this.somePerson = new Person({ name : 'Bob' });
	this.someSettler = new Settler({ name : 'Jeff', tribe : 'Umpqua' });
}

Game.prototype.mainLoop = function() {

	var currentHour = this.currentHour;
	var currentDay = this.currentDay;
	var currentSeasonIdx = this.currentSeasonIdx;

	this.hourCounter++;
	this.currentHour = this.hourCounter % 24;
	document.getElementById("current-hour").innerHTML = this.currentHour;
	this.processHourlyEvents();

	if(this.currentHour == 0){
		this.dayCounter++;
		this.currentDay = this.dayCounter % 30;
		document.getElementById("current-day").innerHTML = this.currentDay;
		this.processDailyEvents();

		if(this.currentDay == 0){
			this.seasonCounter++;
			this.currentSeasonIdx = this.seasonCounter % 4;
			this.currentSeason = this.seasons[this.currentSeasonIdx];
			document.getElementById("current-season").innerHTML = this.currentSeason;
			this.processSeasonalEvents();

			if(this.currentSeasonIdx == 0){
				this.yearCounter++;
				document.getElementById("current-year").innerHTML = this.yearCounter;
				this.processYearlyEvents();
			}
		}
	}
}

//Handle recurring events

Game.prototype.processHourlyEvents = function(){
	var eventsForThisHour = this.hourlyEvents[this.currentHour];

	if(eventsForThisHour != undefined){
		$.each( eventsForThisHour, function(idx, hourlyEvent){
			game[hourlyEvent]();
		});
	}
}

Game.prototype.processDailyEvents = function(){
	var eventsForThisDay = this.dailyEvents[this.currentDay];

	if(eventsForThisDay != undefined){
		$.each( eventsForThisDay, function(idx, dailyEvent){
			game[dailyEvent]();
		});
	}

	this._doDailyStarvationCalculation();

	//Reset meal counters
	this.dailyMealsDesired = 0;
	this.dailyMealsServed = 0;
}

Game.prototype.processSeasonalEvents = function(){
	var eventsForThisSeason = this.seasonalEvents[this.seasonCounter];

	if(eventsForThisSeason != undefined){
		$.each( eventsForThisSeason, function(idx, seasonalEvent){
			game[seasonalEvent]();
		});
	}

	this.doChildAgingEventCheck();
	this.doAdultAgingEventCheck();
	this.doDeathEventCheck();
}

Game.prototype.processYearlyEvents = function(){

}

Game.prototype._doDailyStarvationCalculation = function(){
	if( (this.dailyMealsServed / this.dailyMealsDesired) < 0.6){
		this.starvationMarkers++;
		if(this.starvationMarkers > 10){
			this.starvationMarkers = 10;
		}
		console.log("Starvation markers: " + this.starvationMarkers);
	}else{
		this.starvationMarkers-=2;
		if(this.starvationMarkers < 0){
			this.starvationMarkers = 0;
		}
		console.log("Starvation markers: " + this.starvationMarkers);
	}

	if(this.starvationMarkers > 3){
		this.processStarvationEvent();
	}
}

Game.prototype.consumeFoodEvent = function(){
	var currentFood = this.resources().food;
	var consumedFood = this.totalSettlers();
	this.dailyMealsDesired+=consumedFood;
	var leftoverFood = currentFood - consumedFood;
	var mealsServed = (leftoverFood < 0) ? consumedFood + leftoverFood : consumedFood ;
	this.dailyMealsServed+=mealsServed;
	this._updateObservableProp(this.resources, {food : currentFood - mealsServed});
	console.log("Food leftover after serving: " + this.resources().food);
}

Game.prototype.doChildAgingEventCheck = function(){
	if( this.scheduledChildAgingEvents[this.seasonCounter] != undefined){
		this.ageChildren( this.scheduledChildAgingEvents[this.seasonCounter] );
	}
}

Game.prototype.doAdultAgingEventCheck = function(){
	if( this.scheduledAdultAgingEvents[this.seasonCounter] != undefined){
		this.ageAdults( this.scheduledAdultAgingEvents[this.seasonCounter] );
	}
}

Game.prototype.doDeathEventCheck = function(){
	if( this.scheduledDeathEvents[this.seasonCounter] != undefined){
		this.killOldAdults( this.scheduledDeathEvents[this.seasonCounter] );
	}
}

Game.prototype.ageChildren = function(numChildren){
	for(var i = 0; i < numChildren; i++){
		var seasonsBeforeNextStage = 4 * $Utils.doRand(40, 51);
		var tarIdx = this.seasonCounter + seasonsBeforeNextStage;

		this.scheduledAdultAgingEvents[tarIdx] = (this.scheduledAdultAgingEvents[tarIdx] || 0) + 1;
	}
}

Game.prototype.ageAdults = function(numAdults){
	for(var i = 0; i < numAdults; i++){
		var seasonsBeforeNextStage = 4 * $Utils.doRand(10, 21);
		var tarIdx = this.seasonCounter + seasonsBeforeNextStage;

		this.scheduledDeathEvents[tarIdx] = (this.scheduledDeathEvents[tarIdx] || 0) + 1;
	}
}

Game.prototype.killOldAdults = function(numOldAdults){
	for(var i = 0; i < numOldAdults; i++){
		if( this.availableSettlers() > 0 ){
			this.availableSettlers( this.availableSettlers() - 1 );
			console.log("A settler has died of old age. Num left: " + this.totalSettlers());
		}else if ( this.workingSettlers() > 0 ){
			this.workingSettlers( this.workingSettlers() - 1 );
			console.log("A settler has died of old age. Num left: " + this.totalSettlers());
		}else if(this.busySettlers() > 0){
			this.busySettlers( this.busySettlers() - 1 );
			console.log("A settler has died of old age. Num left: " + this.totalSettlers());
		}

		if( this.availableSettlers() == 0 && this.workingSettlers() == 0 && this.busySettlers() == 0){
			this.gameOver();
		}
	}
}

Game.prototype.processStarvationEvent = function(){
	var roll = $Utils.doRand(1, 11);
	if(roll <= this.starvationMarkers){

		if(this.availableSettlers() > 0){
			this.availableSettlers( this.availableSettlers() - 1 );
			console.log("A settler has died. Num left: " + this.totalSettlers());
		}else if(this.workingSettlers() > 0){
			this.workingSettlers( this.workingSettlers() - 1 );
			console.log("A settler has died. Num left: " + this.totalSettlers());
		}else if(this.busySettlers() > 0){
			this.busySettlers( this.busySettlers() - 1 );
			console.log("A settler has died. Num left: " + this.totalSettlers());
		}
		if(this.totalSettlers() == 0){
			this.gameOver();
		}
	}
}

//End handle recurring events

//Time logic

Game.prototype.startMainTimer = function() {
	var self = this;
	this.timer = setInterval(function() { self.mainLoop() }, this.timerInterval);
}

Game.prototype.pauseMainTimer = function() {
	clearInterval(this.timer);
}

Game.prototype.restartMainTimer = function() {
	this.pauseMainTimer();
	this.startMainTimer();
}

//End time logic

//User time controls

Game.prototype.spcAction = function(){
	if(!this.isPopupVisible){
		if(this.isPlaying){
			this.pauseMainTimer();
		}else if (!this.isGameOver){
			this.startMainTimer();
		}
		this.isPlaying = !this.isPlaying;
	}
}

Game.prototype.plusAction = function(){
	if(this.playSpeed() == 4){
		return;
	}
	this.playSpeed( this.playSpeed() + 1 );
	this._setIntervalBasedOnPlaySpeedInteger();

	if(this.isPlaying){
		this.restartMainTimer();
	}
}

Game.prototype.minusAction = function(){
	if(this.playSpeed() == 1){
		return;
	}
	this.playSpeed( this.playSpeed() - 1 );
	this._setIntervalBasedOnPlaySpeedInteger();

	if(this.isPlaying){
		this.restartMainTimer();
	}
}

Game.prototype._setIntervalBasedOnPlaySpeedInteger = function(){
	if(this.playSpeed() == 1){
		this.timerInterval = 1000;
	}else if(this.playSpeed() == 2){
		this.timerInterval = 500;
	}else if(this.playSpeed() == 3){
		this.timerInterval = 250;
	}else if(this.playSpeed() == 4){
		this.timerInterval = 100;
	}
}

//End user time controls

//Utility functions

/**
 * Update existing properties on an existing observable and optionally add new ones
 * @param {observable} obs - A reference to an observable
 * @param {object} newData - An object containing key+value pairs of the properties to set on the observable
 * @param {boolean} clearUnusedKeys - Whether or not to delete keys on the existing observable that do not exist in the newData object (default: 0)
 * @param {boolean} addNewKeys - Whether or not to add new keys to the existing observable if they are defined in the newData object (default: 1)
 */
Game.prototype._updateObservableProp = function(obs, newData, clearUnusedKeys, addNewKeys) {

	if( !ko.isObservable(obs) ){
		console.log("_updateObservableProp requires an observable as its first argument");
		return false;
	}

	clearUnusedKeys 	= $Utils.setDefaultValue(clearUnusedKeys, 0);
	addNewKeys 			= $Utils.setDefaultValue(addNewKeys, 1);
	var current 		= obs();
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

	obs(current);
}

/**
 * Fade out a target element and fade in a second target element, optionally. Returns a Promise
 * @param {string|jQuery} firstElemOrSelector - A string containing a valid jQuery selector or a jQuery object
 * @param {string|jQuery} secondElemOrSelector - A string containing a valid jQuery selector or a jQuery object
 * @param {integer|undefined} fadeOutSpeed - the speed (in ms) to fade out the first object (default: 300)
 * @param {integer|undefined} fadeInSpeed - the speed (in ms) to fade in the second object (default: 300)
 * @param {function|undefined} midTransitionCallback - Optional callback to perform between the transitions
 * @return Promise
 */
Game.prototype._hideOneElemAndShowAnother = function(firstElemOrSelector, secondElemOrSelector, fadeOutSpeed, fadeInSpeed, midTransitionCallback){

	var promise = new Promise(function(resolve, reject){

		firstElemOrSelector = ( firstElemOrSelector instanceof jQuery ) ? firstElemOrSelector : $(firstElemOrSelector) ;
		secondElemOrSelector = ( secondElemOrSelector instanceof jQuery ) ? secondElemOrSelector : $(secondElemOrSelector) ;
		fadeOutSpeed = (fadeOutSpeed != undefined) ? fadeOutSpeed : 300 ;
		fadeInSpeed = (fadeInSpeed != undefined) ? fadeInSpeed : 300 ;

		firstElemOrSelector.fadeOut(fadeOutSpeed, function(){

			if(midTransitionCallback && typeof midTransitionCallback === 'function'){
				midTransitionCallback();
			}

			secondElemOrSelector.fadeIn(fadeInSpeed, function(){
				resolve();
			});

		});

	});

	return promise;

}

/**
 * Reveal a div from left to right. Returns a Promise
 * @param {string|jQuery} targetElemOrSelector - A string containing a valid jQuery selector or a jQuery object
 * @param {integer|undefined} revealSpeed - the speed (in ms) to reveal the target div (default: 2000)
 * @param {integer|undefined} waitInSecondsBeforeReturning - the speed (in ms) to wait before returning (default: 0)
 * @return Promise
 */
Game.prototype.revealText = function(targetElemOrSelector, revealSpeed, waitInSecondsBeforeReturning) {

	var promise = new Promise(function(resolve, reject){

		targetElemOrSelector = ( targetElemOrSelector instanceof jQuery ) ? targetElemOrSelector : $(targetElemOrSelector) ;
		revealSpeed = (revealSpeed != undefined) ? revealSpeed : 2000 ;
		waitInSecondsBeforeReturning = waitInSecondsBeforeReturning || 0;

		var origPosition = targetElemOrSelector.css("position");
		var origOverflow = targetElemOrSelector.css("overflow");
		targetElemOrSelector.css("position", "relative");
		targetElemOrSelector.css("overflow", "hidden");

		var overlayDiv = $('<div></div>').css({
			position : 'absolute',
			top : '0px',
			left : '-10%',
			width : '110%',
			height : '100%',
		}).addClass('white-gradient-with-transparency').appendTo(targetElemOrSelector);
		targetElemOrSelector.show();
		overlayDiv.hide("slide", { direction: "right", easing: "linear" }, revealSpeed, function(){
			
			overlayDiv.remove();
			targetElemOrSelector.css("position", origPosition);
			targetElemOrSelector.css("overflow", origOverflow);

			setTimeout(function(){
				resolve();
			}, waitInSecondsBeforeReturning);

		});

	});

	return promise;

}

//End utility functions

//Start map functions

Game.prototype.generateHeightMapUsingParticleDepositionAlgorithm = function(options){

	//var map = game.generateHeightMapUsingParticleDepositionAlgorithm({width : 50, height : 50, numberOfDropPoints : 100, minParticlesPerPoint : 3, maxParticlesPerPoint : 3, numPasses : 1, minRadiusToLookForLowerNeighbors : 1, maxRadiusToLookForLowerNeighbors : 5, dontRepeatPoints : 1, numBlurPasses : 3});

	options = options || {};

	var width = options.width || 100;
	var height = options.height || 100;
	var numberOfDropPoints = options.numberOfDropPoints || 10;
	var minParticlesPerPoint = options.minParticlesPerPoint || 1;
	var maxParticlesPerPoint = options.maxParticlesPerPoint || 5;
	var numPasses = options.numPasses || 1;
	var minRadiusToLookForLowerNeighbors = options.minRadiusToLookForLowerNeighbors || 1;
	var maxRadiusToLookForLowerNeighbors = options.maxRadiusToLookForLowerNeighbors || 1;
	var dontRepeatPoints = options.dontRepeatPoints || 0;
	var numBlurPasses = $Utils.setDefaultValue(options.numBlurPasses, 1);

	var mapArray = [];
	var pickedPoints = {};

	//Initialize the grid structure
	for (var h = 0; h < height; h++) {
		if( mapArray[h] == undefined ){
			mapArray[h] = [];
		}
		for (var w = 0; w < width; w++) {
			mapArray[h][w] = 0;
		}
	}

	for(var pass = 0; pass < numPasses; pass++){

		for(var d = 0; d < numberOfDropPoints; d++){

			//Don't pick any edge points (doRand upper bounds is exclusive, so it doesn't need anything special)
			var randY = $Utils.doRand(1, height);
			var randX = $Utils.doRand(1, width);

			//Avoid an "undefined" error
			if(pickedPoints[randY] == undefined){
				pickedPoints[randY] = {};
			}

			while(dontRepeatPoints && pickedPoints[randY][randX] == 1){

				randY = $Utils.doRand(1, height);
				randX = $Utils.doRand(1, width);

				//Avoid an "undefined" error
				if(pickedPoints[randY] == undefined){
					pickedPoints[randY] = {};
				}
			}
			if(dontRepeatPoints){
				pickedPoints[randY][randX] = 1;
			}

			var numParticlesToDrop = $Utils.doRand(minParticlesPerPoint, maxParticlesPerPoint + 1);
			for(var p = 0; p < numberOfDropPoints; p++){

				mapArray[randY][randX]+=1;

				var radiusToLookForLowerNeighbors = $Utils.doRand(minRadiusToLookForLowerNeighbors, maxRadiusToLookForLowerNeighbors + 1);

				var lowestPointNeighbor = this._getLowestPointNeighbor(randY, randX, radiusToLookForLowerNeighbors, height, width, mapArray);

				if(mapArray[randY][randX] - lowestPointNeighbor.z > 1){
					mapArray[randY][randX]-=1;
					mapArray[lowestPointNeighbor.y][lowestPointNeighbor.x]+=1;
				}
			}
		}
	}

	//console.log("Before blur");
	//this._TESTLOGMAP(mapArray);

	if(numBlurPasses > 0){

		mapArray = this._applyBlurToMap(numBlurPasses, mapArray);

		//console.log("After blurring is done");
		//this._TESTLOGMAP(mapArray);

	}
	this.mapArray(this._translateHeightsIntoColorsForArray(mapArray));
	return mapArray;
}

Game.prototype._getLowestPointNeighbor = function(h, w, radius, mapHeight, mapWidth, mapArray){
	
	var northBounds = (h - radius < 0) ? 0 : h - radius ;
	var southBounds = (h + radius > mapHeight) ? mapHeight - 1 : h + radius ;

	var westBounds = (w - radius < 0) ? 0 : w - radius ;
	var eastBounds = (w + radius > mapWidth) ? mapWidth - 1 : w + radius ;

	var neighborsIndexedByHeight = {};

	//Grab the in-bounds squares and index them by height
	for (var y = northBounds; y < southBounds; y++) {
		for (var x = westBounds; x < eastBounds; x++) {
			
			var z = mapArray[y][x];

			if( neighborsIndexedByHeight[z] == undefined ){
				neighborsIndexedByHeight[z] = [];
			}

			neighborsIndexedByHeight[z].push({x : x, y : y, z : z});
		}
	}

	var sortedHeights = Object.keys(neighborsIndexedByHeight).sort();
	var lowestHeight = sortedHeights[0];

	return $Utils.chooseRandomly(neighborsIndexedByHeight[lowestHeight]);

}

Game.prototype._applyBlurToMap = function(numBlurPasses, mapArray){

	var newArray = [];
	var intermediateArray = [];
	var oneDimensionalKernel1 = [ 0.06136, 0.24477, 0.38774, 0.24477, 0.06136 ];
	var oneDimensionalKernel2 = [ 0.006, 0.061, 0.242, 0.383, 0.242, 0.061, 0.006 ];

	var kernelToUse = oneDimensionalKernel2;
	var centerOfKernel = Math.round(kernelToUse.length / 2) - 1;

	var outputValue = 0;
	var offsetOfCurrentSquare;
	var horizIdx;
	var vertIdx;

	var arrayToBlur;

	for(var b = 0; b < numBlurPasses; b++){

		arrayToBlur = (newArray.length == 0) ? mapArray : newArray ;

		//Horizontal pass
		for(var hy = 0; hy < arrayToBlur.length; hy++){

			for(var hx = 0; hx < arrayToBlur[hy].length; hx++){

				outputValue = 0;				

				for(var k = 0; k < kernelToUse.length; k++){

					offsetOfCurrentSquare = k - centerOfKernel;
					horizIdx = (hx + offsetOfCurrentSquare);
					horizIdx = (horizIdx < 0) ? 0 : horizIdx ;
					horizIdx = (horizIdx > (arrayToBlur[hy].length - 1)) ? arrayToBlur[hy].length - 1 : horizIdx ;
					
					outputValue += (arrayToBlur[hy][horizIdx] * kernelToUse[k]);
				}

				//Put the new value in the intermediate array
				if( intermediateArray[hy] == undefined ){
					intermediateArray[hy] = [];
				}
				intermediateArray[hy][hx] = Math.ceil(outputValue);

			}

		}

		//Vertical pass
		for(var vy = 0; vy < intermediateArray.length; vy++){

			for(var vx = 0; vx < intermediateArray[vy].length; vx++){

				outputValue = 0;

				for(k = 0; k < kernelToUse.length; k++){

					offsetOfCurrentSquare = k - centerOfKernel;
					vertIdx = (vy + offsetOfCurrentSquare);
					vertIdx = (vertIdx < 0) ? 0 : vertIdx ;
					vertIdx = (vertIdx > (intermediateArray.length - 1)) ? intermediateArray.length - 1 : vertIdx ;
					
					outputValue += (intermediateArray[vertIdx][vx] * kernelToUse[k]);
				}

				//Put the new value in the intermediate array
				if( newArray[vy] == undefined ){
					newArray[vy] = [];
				}
				newArray[vy][vx] = Math.ceil(outputValue);

			}

		}
	}

	return newArray;

}

Game.prototype._translateHeightsIntoColorsForArray = function(mapArray){

	var colorArray = [];
	var heightVal;
	var color;

	var colorKey = {
		/*0 : "#330044",
		1 : "#220066",
		2 : "#1133cc",
		3 : "#33dd00",
		4 : "#ffda21",
		5 : "#ff6622",
		6 : "#d10000",*/

		/*5 : "#220066",
		6 : "#1133cc",
		7 : "#33dd00",
		8 : "#ffda21",
		9 : "#ff6622",
		10 : "#d10000",*/

		6 : "#0004E3", //blue
		7 : "#D0E300", //yellow
		8 : "#56C656", //l green
		9 : "#0a9000", //d green
		10 : "#8C8C8C", //gray
		11 : "#8C8C8C", //gray
	};

	/*var k = 0;
	for(var i = 10; i < 255; i+=10){
		var hexVal = i.toString(16);
		colorKey[k] = "#" + hexVal + hexVal + hexVal;
		k++;
	}*/

	for (var h = 0; h < mapArray.length; h++) {
		for (var w = 0; w < mapArray[h].length; w++) {
			heightVal = mapArray[h][w];

			//color = (colorKey[heightVal] != undefined) ? colorKey[heightVal] : "#ffffff" ;

			if(heightVal < 6){
				//color = "#0004E3";
				color = "#0005af";
			}else if(heightVal > 11){
				color = "#f7f7f7";
			}else{
				color = colorKey[heightVal];
			}
			
			if( colorArray[h] == undefined ){
				colorArray[h] = [];
			}

			colorArray[h][w] = { color : color, height : heightVal };
		}
	}
	return colorArray;
}

Game.prototype._TESTLOGMAP = function(mapArray){
	for (var h = 0; h < mapArray.length; h++) {
		console.log(mapArray[h].join(" "));
	}
}

//End map functions

Game.prototype.gameOver = function(){
	console.log('No settlers left.');
	this.pauseMainTimer();
	this.isGameOver = 1;
}

Game.prototype.newGame = function() {
	var self = this;
	this._hideOneElemAndShowAnother(
		"#newgame-content",
		"#intro-content",
		300,
		300
	).then(function(){
		return self.revealText("#intro-s1-p1", 3000, 1000);
	}).then(function(){
		return self.revealText("#intro-s1-p2", 3000, 1000);
	}).then(function(){
		return self.revealText("#intro-s1-p3", 3000, 1000);
	}).then(function(){
		$("#intro-s1-buttons").fadeIn(500);
	});
}

Game.prototype._setupDefaultTimeEvents = function(){
	var self = this;
	$.each( [7, 12, 18], function(idx, hour){
		self.hourlyEvents[hour] = $Utils.pushOntoArray(self.hourlyEvents[hour], "consumeFoodEvent" )
	});
}

Game.prototype._getDefaultResources = function(){
	return {
		food : 105
	};
}





//This is just temporary stuff to stop JS errors
Game.prototype.hideModal = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.showModalClose = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.modalWindowTitle = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.modalWindowText = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.showModalWindowFooter = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.loadGame = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.saveGame = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.logMessages = function() {
	console.log('NOT IMPLEMENTED YET');
}
Game.prototype.showFaq = function() {
	console.log('NOT IMPLEMENTED YET');
}