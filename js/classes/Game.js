var $Utils = Utils.prototype;

var Game = function(data) {
	this.init(data);
};

Game.prototype.init = function(data){

	var self = this;

	var startingNewGame = false;
	if(data == undefined || data == {}){
		startingNewGame = true;
		data = {};
	}

	//Static properties
	this.seasons = [
		'Spring',
		'Summer',
		'Fall',
		'Winter',
	];

	//Regular properties
	this.timer;
	this.hourCounter = data.hourCounter || 1;
	this.dayCounter = data.dayCounter || 1;
	this.seasonCounter = data.seasonCounter || 0;
	this.yearCounter = data.yearCounter || 1;
	this.currentHour = data.currentHour || 1;
	this.currentDay = data.currentDay || 1;
	this.currentSeason = this.seasons[this.seasonCounter % 4];
	this.isPlaying = data.isPlaying || 0;
	this.timerInterval = data.timerInterval || 1000;
	this.isPopupVisible = data.isPopupVisible || 0;
	this.hourlyEvents = data.hourlyEvents || {};
	this.dailyEvents = data.dailyEvents || {};
	this.seasonalEvents = data.seasonalEvents || {};
	this.yearlyEvents = data.yearlyEvents || {};
	this.dailyMealsDesired = data.dailyMealsDesired || 0;
	this.dailyMealsServed = data.dailyMealsServed || 0;
	this.lowFoodDaysCount = data.lowFoodDaysCount || 0;
	this.isGameOver = data.isGameOver || 0;
	this.scheduledChildAgingEvents = data.scheduledChildAgingEvents || { 7 : 1 };
	this.scheduledAdultAgingEvents = data.scheduledAdultAgingEvents || { 9 : 1, 12 : 1, 16 : 1 };
	this.scheduledDeathEvents = data.scheduledAgingEvents || { 22 : 1 };
	this.isDebugMode = 0;
	this.introCompleted = data.introCompleted || 0;
	this.wordForSettlersSingle = data.wordForSettlersSingle || 0;
	this.wordForSettlersPlural = data.wordForSettlersPlural || 0;
	this.buildingSquares = data.buildingSquares || [];
	this.pausedPlaySpeed = data.playspeed || 1;

	//Observables
	this.availableSettlers = ko.observable( $Utils.setDefaultValue(data.availableSettlers, 5) );
	this.busySettlers = ko.observable(data.busySettlers || 0);
	this.settlerJobs = ko.observable(data.settlerJobs || { scavenger : 0, builder : 0 });
	this.settlerJobCapacities = ko.observable(data.settlerJobCapacities || {});
	this.childSettlers = ko.observable( $Utils.setDefaultValue(data.childSettlers, 1) );
	this.adultSettlers = ko.observable( $Utils.setDefaultValue(data.adultSettlers, 1) );
	this.oldSettlers = ko.observable( $Utils.setDefaultValue(data.oldSettlers, 1) );
	this.resources = ko.observable(data.resources || this._getDefaultResources());
	this.playSpeed = ko.observable( data.playspeed || 1);
	this.newGameGeneratedMaps = ko.observableArray([]);
	this.selectedMapIdx = ko.observable();
	this.leadersToChooseFrom = ko.observableArray([]);
	this.selectedLeaderIdx = ko.observable( $Utils.setDefaultValue(data.selectedLeaderIdx, -1));
	this.currentlySelectedCell = ko.observable("");
	this.starvationMarkers = ko.observable(data.starvationMarkers || 0);
	this.oldAgeDeaths = ko.observable(data.oldAgeDeaths || 0);
	this.starvationDeaths = ko.observable(data.starvationDeaths || 0);
	this.gameMapRows = ko.observableArray([]).extend({notify: 'always'});

	this.gameMap = ko.observable(0).extend({notify: 'always'});
	if(data.gameMap){
		this.gameMap(new GameMap(data.gameMap));
		self.gameMapRows(self.gameMap().rows());
	}
	
	//Computed
	this.workingSettlers = ko.computed(function(){
		var workingSettlers = 0;
		var settlerJobs = self.settlerJobs();
		
		_.forEach(Object.keys(settlerJobs), function(job){
			workingSettlers += settlerJobs[job];
		});

		return workingSettlers;
	});
	this.totalSettlers = ko.computed(function(){
		return (self.availableSettlers() || 0) + (self.workingSettlers() || 0) + (self.busySettlers() || 0);
	});
	this.settlerJobTypesArray = ko.computed(function(){
		var settlerJobs = self.settlerJobs();
		var jobKeys = Object.keys(settlerJobs);
		var jobs = [];
		_.forEach(Object.keys(settlerJobs), function(job){
			var jobObject = { job : job, numSettlers : settlerJobs[job] };
			if(self.settlerJobCapacities()[job] != undefined){
				jobObject.maxSettlers = self.settlerJobCapacities()[job];
			}
			jobs.push(jobObject);
		});
		return jobs;
	});
	/*this.gameMapRows = ko.computed(function(){
		if(self.gameMap && self.gameMap()){
			return self.gameMap().rows();
		}
		return [];
	});*/
	this.gameMap.subscribe(function(newValue) {
		console.log("shit changed");
		var output = [];
		var gameMapDiv = $('#game-map');

		var rows = newValue.rows();

		_.forEach(rows, function(row){
			output.push('<div class="map-row">');
			_.forEach(row, function(cell){
				var isUnderConstruction = cell.construction_required > 0;
				var currentCell = self.currentlySelectedCell();
				var isSelected = (cell.row == currentCell.row && cell.column == currentCell.column);
				output.push('<div class="map-cell xlg ' + (isUnderConstruction ? 'construction ' : '') + (isSelected ? 'selected ' : '') + '" style="background-color : ' + self._translateTerrainTypeIntoColor(cell) + '" data-bind="click : function() { setActiveCell(' + cell.row + ',' + cell.column + ') }"></div>');
				// , 
			});
			output.push('<div class="clear"></div>');
			output.push('</div>');
		});
		gameMapDiv.html(output.join(''));
		ko.applyBindingsToDescendants(self, gameMapDiv[0]);
/*<!-- ko foreach: gameMapRows() -->
<div class="map-row">
<!-- ko foreach: $data -->
<div class="map-cell xlg" data-bind="style : {backgroundColor : $root._translateTerrainTypeIntoColor($data)}, attr : {'data-height' : $data.height}, click : function() { $root.setActiveCell($data) }, css : { construction : $data.construction_required > 0}"></div>
<!-- /ko -->
<div class="clear"></div>
</div>
<!-- /ko -->*/
	});

	//Init behavior
	document.getElementById("current-hour").innerHTML = this.currentHour;
	document.getElementById("current-day").innerHTML = this.currentDay;
	document.getElementById("current-season").innerHTML = this.currentSeason;
	document.getElementById("current-year").innerHTML = this.yearCounter;

	if(startingNewGame){
		this._setupDefaultTimeEvents();
	}

	//Set up leaders
	this.leadersToChooseFrom([
		{
			id : 'torvald',
			name : 'Torvald Magnusson',
			age : 44,
			bio : 'Until very recently, a much-beloved CEO of a Fortune 100 company. According to his husband, Torvald\'s silver tongue could "charm the spots off a leopard." '
				+ 'There\'s usually less working and a lot more talking when he\'s around, but everybody sure has a good time.', // +2 recruitment, -1 construction
			strengthDescription : '+2 Recruitment',
			weaknessDescription : '-1 Construction',
			textStages : {
				s2 : "Well, this is something that Tony Robbins never talked about, that's for sure. I can make this work, though."
					+ " Just have to adapt. Think of it as...drastically changing market conditions. Going to see how many people I can recruit for this new \"enterprise.\"",
				s3 : "Alright, seems we've got a few new \"hires.\" One of them has some knowledge of local resources to boot. Now that's someone you want around! Her first task as head of the"
					+ " newly formed Location Selection Department was to draw me up a map of the area from her memory. I've decided to \"incorporate\" us here:",
				s4 : "It's taken several days of travel, but we've made it, I think! It's been a couple days since we encountered anyone else, at least, so I'm sure we're not in any immediate danger."
					+ " We've got some basic shelter established, courtesy of one of the same woman who drew up the maps. Need to think about promoting her. Company morale is a little shaky right now,"
					+ " so it would probably be safer to wait. Enough idle thought for now. If this enterprise is going to succeed, I'll need to start divying up tasks sooner than later. Time to show"
					+ " these people why I make the big bucks. Oh...\"made\", I guess."
			},
			wordForSettlersSingle : "Employee",
			wordForSettlersPlural : "Employees",
		},
		{
			id : 'melody',
			name : 'Melody Sterling',
			age : 28,
			bio : 'Raised on a farm, Melody has never been one to shy away from hard work. Somewhat plain-spoken, but you\'ll not find anyone more practical or earnest. '
				+ 'Whenever she has spare time she likes to play the guitar or sew.', // +1 construction
			strengthDescription : '+1 Construction',
			weaknessDescription : '',
			textStages : {
				s2 : "Well, this is certainly a turn of events. Seems what's done is done, though. No sense in crying over spilt milk. Nobody's stepped up to take the reins yet,"
					+ " but someone's got to or ain't a one of us gonna make it. Will see how many of us I can get together. Need to move fast or there might not be anything left worth saving.",
				s3 : "Found some people willing to make a go of it. Not so different than our ancestors, I suppose. It looks like I've got the most knowledge of the area, so it's"
					+ " fallen to me to pick the best place to settle. Not sure I'm an expert, but I've got a few locations in mind. I think we should try here: ",
				s4 : "Well, we made it. Looks just about like I remember, fortunately. The journey was...it's not something I want to talk about just yet. Just...just need to focus on surviving for now."
					+ " Now more than ever these folks need hope, and I'll be damned if I'm not going to try. We have to try, we've just got to. Enough chit-chat, though, there's a lot of work to do."
			},
			wordForSettlersSingle : "Survivor",
			wordForSettlersPlural : "Survivors",
		},
		{
			id : 'philip',
			name : 'Philip Olivares',
			age : 35,
			bio : 'A self-professed nerd and history buff. Highly intelligent, you\'ll usually find Philip with his nose in a book. '
				+ 'His "big picture" worldview tends to give those around him the impression that he\'s a bit out of touch with reality.', // +2 research, -1 recruitment
			strengthDescription : '+2 Research',
			weaknessDescription : '-1 Recruitment',
			textStages : {
				s2 : "Implementing phase one of Neo-Feudal System. Must think of better name than that. Need to keep the laborers happy. Will report back on recruitment efforts.",
				s3 : "Selection of ideal settling location is necessary. Essential in these first few days to establish position at top of new order. Located several maps of the area."
					+ " Will tell the others we are settling here:",
				s4 : "Journey completed. Site looks promising. Believe I have sucessfully established myself at top of new hierarchy while en route. This is good, it is essential to maintain control during"
					+ " early stages. Rudimentary home base has been established. Time to start assigning jobs to individuals to ensure survival of tribe."
			},
			wordForSettlersSingle : "Subject",
			wordForSettlersPlural : "Subjects",
		},
	]);
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

	//this.processSettlerWork();
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
	var starvationMarkers = this.starvationMarkers();
	if( (this.dailyMealsServed / this.dailyMealsDesired) < 0.6){
		starvationMarkers++;
		if(starvationMarkers > 10){
			starvationMarkers = 10;
		}
		console.log("Starvation markers: " + starvationMarkers);
	}else{
		starvationMarkers-=2;
		if(starvationMarkers < 0){
			starvationMarkers = 0;
		}
		console.log("Starvation markers: " + starvationMarkers);
	}
	this.starvationMarkers(starvationMarkers);

	if(this.starvationMarkers() > 3){
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

Game.prototype.buildFarm = function(){
	var self = this;
	if(this.hasSufficientBuildingMaterialsForBuildingType("farm")){
		var requiredMaterials = this.getRequiredBuildingMaterials("farm");

		_.forEach(requiredMaterials, function(materialCount, materialName){
			self.resources()[materialName] = self.resources()[materialName] - materialCount;
		});
		self.resources( self.resources() );

		var currentCell = this.currentlySelectedCell();
		var newCellData = {
			improvement_type : "farm",
			construction_progress : 0,
			construction_required : 40,
		};
		this.gameMap(this.gameMap().updateCell(currentCell.row, currentCell.column, newCellData));
		this.buildingSquares.push($.extend(currentCell, newCellData));
		this._updateActiveCell();
	}
}

/*Game.prototype.processSettlerWork = function(){
	var self = this;
	var settlerJobs = this.settlerJobs();

	_.forEach(Object.keys(settlerJobs), function(jobKey){
		var numSettlers = settlerJobs[jobKey];
		if(numSettlers > 0){

			if(jobKey == "builder"){
				self._processConstruction(numSettlers);
			}

		}
	});
}*/

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
			this.oldAgeDeaths( this.oldAgeDeaths() + 1 );
			console.log("A settler has died of old age. Num left: " + this.totalSettlers());
		}else if ( this.workingSettlers() > 0 ){

			//Put this in a private function
			var jobsWithActiveSettlers = [];
			var settlerJobs = this.settlerJobs();
			_.forEach(Object.keys(settlerJobs), function(jobKey){
				if(settlerJobs[jobKey] > 0){
					jobsWithActiveSettlers.push(jobKey);
				}
			});
			var jobToLoseASettler = $Utils.chooseRandomly(jobsWithActiveSettlers);

			var updatedJobObject = {};
			updatedJobObject[jobToLoseASettler] = settlerJobs[jobToLoseASettler] - 1;
			this._updateObservableProp(this.settlerJobs, updatedJobObject);

			this.oldAgeDeaths( this.oldAgeDeaths() + 1 );
			console.log("A settler has died of old age. Num left: " + this.totalSettlers());
		}else if(this.busySettlers() > 0){
			this.busySettlers( this.busySettlers() - 1 );
			this.oldAgeDeaths( this.oldAgeDeaths() + 1 );
			console.log("A settler has died of old age. Num left: " + this.totalSettlers());
		}

		if( this.availableSettlers() == 0 && this.workingSettlers() == 0 && this.busySettlers() == 0){
			this.gameOver();
		}
	}
}

Game.prototype.processStarvationEvent = function(){
	var roll = $Utils.doRand(1, 11);
	if(roll <= this.starvationMarkers()){

		if(this.availableSettlers() > 0){
			this.availableSettlers( this.availableSettlers() - 1 );
			this.starvationDeaths( this.starvationDeaths() + 1 );
			console.log("A settler has died. Num left: " + this.totalSettlers());
		}else if(this.workingSettlers() > 0){
			var jobsWithActiveSettlers = [];
			var settlerJobs = this.settlerJobs();
			_.forEach(Object.keys(settlerJobs), function(jobKey){
				if(settlerJobs[jobKey] > 0){
					jobsWithActiveSettlers.push(jobKey);
				}
			});
			var jobToLoseASettler = $Utils.chooseRandomly(jobsWithActiveSettlers);

			var updatedJobObject = {};
			updatedJobObject[jobToLoseASettler] = settlerJobs[jobToLoseASettler] - 1;
			this._updateObservableProp(this.settlerJobs, updatedJobObject);
			this.starvationDeaths( this.starvationDeaths() + 1 );
			console.log("A settler has died. Num left: " + this.totalSettlers());
		}else if(this.busySettlers() > 0){
			this.busySettlers( this.busySettlers() - 1 );
			this.starvationDeaths( this.starvationDeaths() + 1 );
			console.log("A settler has died. Num left: " + this.totalSettlers());
		}
		if(this.totalSettlers() == 0){
			this.gameOver();
		}
	}
}

Game.prototype.processScavengingEvent = function(){
	var numSettlers = this.settlerJobs().scavenger;
	var itemToReceive;
	for(var i = 0; i < numSettlers; i++){
		itemToReceive = $Utils.doBasedOnPercent({
			10 : [
				"food",
				"timber",
				"stone",
				"scrap",
				"tools",
			],
			50 : 0
		});

		if(itemToReceive){
			var updatedResourcesObject = {};
			updatedResourcesObject[itemToReceive] = this.resources()[itemToReceive] + 1;
			this._updateObservableProp(this.resources, updatedResourcesObject);
		}
	}
	
}

Game.prototype.processConstructionEvent = function(){
	var numSettlersDoingJob = this.settlerJobs().builder;
	if(this.buildingSquares.length > 0 && numSettlersDoingJob > 0){
		var squareToBuild = this.buildingSquares[0];
		squareToBuild.construction_progress += numSettlersDoingJob;

		if(squareToBuild.construction_progress >= squareToBuild.construction_required){
			//complete construction
			this._completeConstruction(squareToBuild);
			this.buildingSquares.shift();
		}else{
			this._updateConstructionProgress(squareToBuild);
		}
		var currentlySelectedCell = this.currentlySelectedCell();
		if(squareToBuild.row == currentlySelectedCell.row && squareToBuild.column == currentlySelectedCell.column){
			this._updateActiveCell();
		}
	}
}

Game.prototype.processFarmingEvent = function(){
	var numSettlersDoingJob = this.settlerJobs().farmer;
	if(this.settlerJobCapacities().farmer > 0 && numSettlersDoingJob > 0){
		var foodToAdd = numSettlersDoingJob;
		var existingFood = this.resources().food;
		this._updateObservableProp(this.resources, {food : (existingFood + foodToAdd)});
	}
}

Game.prototype._updateConstructionProgress = function(squareUnderConstruction){
	var newCellData = { construction_progress : squareUnderConstruction.construction_progress };
	this.gameMap().updateCell(squareUnderConstruction.row, squareUnderConstruction.column, newCellData);
}

Game.prototype._completeConstruction = function(completedSquare){
	var newCellData = { construction_progress : undefined, construction_required : 0, improvement_hp : 100, improvement_level : 1 };
	this.gameMap(this.gameMap().updateCell(completedSquare.row, completedSquare.column, newCellData));

	var currentCapacity;
	if(completedSquare.improvement_type == "farm"){
		if(this.settlerJobs().farmer == undefined){
			this._updateObservableProp(this.settlerJobs, {farmer : 0});
			this._updateObservableProp(this.settlerJobCapacities, {farmer : 0});
		}
		currentCapacity = this.settlerJobCapacities().farmer;
		this._updateObservableProp(this.settlerJobCapacities, {farmer : (currentCapacity + 2)});
	}
}

//End handle recurring events

Game.prototype._updateActiveCell = function(){
	var currentlySelectedCell = this.currentlySelectedCell();
	if(currentlySelectedCell){
		this.currentlySelectedCell(this.gameMap().getCell(currentlySelectedCell.row, currentlySelectedCell.column));
	}
}

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
			this.pausedPlaySpeed = this.playSpeed();
			this.pauseMainTimer();
			this.playSpeed("Paused");
		}else if (!this.isGameOver){
			this.startMainTimer();
			this.playSpeed(this.pausedPlaySpeed);
		}
		this.isPlaying = !this.isPlaying;
	}
}

Game.prototype.plusAction = function(){
	if(this.playSpeed() == 4){
		return;
	}

	if(this.isPlaying){
		this.playSpeed( this.playSpeed() + 1 );
		this._setIntervalBasedOnPlaySpeedInteger();
		this.restartMainTimer();
	}
}

Game.prototype.minusAction = function(){
	if(this.playSpeed() == 1){
		return;
	}

	if(this.isPlaying){
		this.playSpeed( this.playSpeed() - 1 );
		this._setIntervalBasedOnPlaySpeedInteger();
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
				setTimeout(function(){
					resolve();
				}, 0);
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
		if( targetElemOrSelector.length == 0 ){
			//Not actually a success, but prevents getting stuck if a non-existent selector is passed by a dumb programmer
			resolve();
		}
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
		}).addClass('white-gradient-with-left-transparency').appendTo(targetElemOrSelector);
		targetElemOrSelector.show();

		overlayDiv.animate(
			{
				left : '100%'
			},
			revealSpeed,
			"linear",
			function(){
				overlayDiv.remove();
				targetElemOrSelector.css("position", origPosition);
				targetElemOrSelector.css("overflow", origOverflow);

				setTimeout(function(){
					resolve();
				}, waitInSecondsBeforeReturning);
			}
		);

	});

	return promise;

}

Game.prototype.fadeOutDiv = function(targetElemOrSelector, fadeSpeed, waitInSecondsBeforeReturning) {

	var promise = new Promise(function(resolve, reject){

		targetElemOrSelector = ( targetElemOrSelector instanceof jQuery ) ? targetElemOrSelector : $(targetElemOrSelector) ;
		fadeSpeed = (fadeSpeed != undefined) ? fadeSpeed : 2000 ;
		waitInSecondsBeforeReturning = waitInSecondsBeforeReturning || 0;

		var origPosition = targetElemOrSelector.css("position");
		var origOverflow = targetElemOrSelector.css("overflow");
		targetElemOrSelector.css("position", "relative");
		targetElemOrSelector.css("overflow", "hidden");

		var overlayDiv = $('<div></div>').css({
			position : 'absolute',
			top : '-125%',
			left : '0px',
			width : '100%',
			height : '125%',
		}).addClass('white-gradient-with-bottom-transparency').appendTo(targetElemOrSelector);


		overlayDiv.animate(
			{
				top : '0%'
			},
			fadeSpeed,
			"linear",
			function(){
				targetElemOrSelector.hide(0, function(){
					overlayDiv.remove();
					targetElemOrSelector.css("position", origPosition);
					targetElemOrSelector.css("overflow", origOverflow);

					setTimeout(function(){
						resolve();
					}, waitInSecondsBeforeReturning);
				});
			}
		);

	});

	return promise;

}

//End utility functions

//Start map functions

Game.prototype.generateHeightMapUsingParticleDepositionAlgorithm = function(options){

	//var map = game.generateHeightMapUsingParticleDepositionAlgorithm({width : 50, height : 50, numberOfDropPoints : 10, minParticlesPerPoint : 1, maxParticlesPerPoint : 1, numPasses : 10, minRadiusToLookForLowerNeighbors : 1, maxRadiusToLookForLowerNeighbors : 1, numBlurPasses : 2});

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
	var moveTowardsCenterOnSuccessivePasses = $Utils.setDefaultValue(options.moveTowardsCenterOnSuccessivePasses, 1);
	var edgePadding = $Utils.setDefaultValue(options.edgePadding, 1);
	var returnColorizedOrTerrainTypeMap = returnColorizedOrTerrainTypeMap || "terrain";

	var mapArray = [];
	var pickedPoints = {};
	var randX, randY;

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

		//Don't pick any points on the edge or near the edge (want to try and get some more water on the edges of the map)
		var northBounds = 1 + edgePadding;
		var southBounds = height - edgePadding;
		var westBounds = 1 + edgePadding;
		var eastBounds = width - edgePadding;

		if(moveTowardsCenterOnSuccessivePasses){

			var centerOfMapX = Math.round(width / 2);
			var centerOfMapY = Math.round(height / 2);
			//Assuming maps are square, so just pick a bounds and roll with it
			var radius = Math.round(width * 0.25);

			//Just assume we won't run into any bounds issues so let's not waste time checking
			var innerNorthBounds = centerOfMapY - radius;
			var innerSouthBounds = centerOfMapY + radius;

			var innerWestBounds = centerOfMapX - radius;
			var innerEastBounds = centerOfMapX + radius;

			//Start moving concentrically inward
			northBounds+=pass;
			southBounds-=pass;
			westBounds+=pass;
			eastBounds-=pass;

			//Make sure we don't move too far inward (don't want to concentrate all particle drops on a tiny--or negative!--area)
			northBounds = (northBounds > innerNorthBounds) ? innerNorthBounds : northBounds ;
			southBounds = (southBounds < innerSouthBounds) ? innerSouthBounds : southBounds ;
			westBounds = (westBounds > innerWestBounds) ? innerWestBounds : westBounds ;
			eastBounds = (eastBounds < innerEastBounds) ? innerEastBounds : eastBounds ;

		}

		for(var d = 0; d < numberOfDropPoints; d++){

			randY = $Utils.doRand( northBounds, southBounds );
			randX = $Utils.doRand( westBounds, eastBounds );

			//Avoid an "undefined" error
			if(pickedPoints[randY] == undefined){
				pickedPoints[randY] = {};
			}

			while(dontRepeatPoints && pickedPoints[randY][randX] == 1){

				randY = $Utils.doRand( northBounds, southBounds );
				randX = $Utils.doRand( westBounds, eastBounds );

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

	if(numBlurPasses > 0){

		mapArray = this._applyBlurToMap(numBlurPasses, mapArray);

	}

	//var terrainArray = this.translateHeightsIntoTerrain(mapArray);
	var mappedColors = [
		"#0004E3", //blue
		"#D0E300", //yellow
		"#56C656", //l green
		"#0a9000", //d green
		"#8C8C8C", //gray
		"#8C8C8C", //gray
	];
	var mappedTerrain = [
		"water", //blue
		"sand", //yellow
		"grassland", //l green
		"woods", //d green
		"mountain", //gray
		"mountain", //gray
	];

	mapArray = this._getMapArrayCoalescedAndTransformedIntoGivenParameters(
		mapArray,
		(returnColorizedOrTerrainTypeMap == "terrain" ? mappedTerrain : mappedColors ),
		(returnColorizedOrTerrainTypeMap == "terrain" ? "mountain" : "#8C8C8C" )
	);

	var finalizedArray = _.map(mapArray, function(row){
		return _.map(row, function(cell){
			cell.improvement_type = undefined;
			cell.max_resources = 500;
			cell.current_resources = 500;
			cell.terrain_type = cell.mappedValue;

			delete cell.mappedValue;
			return cell;
		});
	});

	return finalizedArray;
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

	var kernelToUse = oneDimensionalKernel1;
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

				//Put the new value in the final output array
				if( newArray[vy] == undefined ){
					newArray[vy] = [];
				}
				newArray[vy][vx] = Math.ceil(outputValue);

			}

		}
	}

	return newArray;

}

Game.prototype._coalesceMapHeightsIntoSequentialValues = function(mapArray, numberOfSegmentsToTryAndGroupInto, debugMode){

	//Get the min and max heights so we know what our range is
	debugMode = debugMode || 0;
	var distinctHeights = this._getDistinctHeights(mapArray);
	var minHeight = distinctHeights[0];
	var maxHeight = distinctHeights[distinctHeights.length - 1];
	var heightSpread = maxHeight - minHeight;
	var totalPossibleSegments = heightSpread + 1;

	numberOfSegmentsToTryAndGroupInto = (numberOfSegmentsToTryAndGroupInto > totalPossibleSegments) ? totalPossibleSegments : numberOfSegmentsToTryAndGroupInto ;
	var segmentSize = Math.floor((heightSpread + 1) / numberOfSegmentsToTryAndGroupInto);

	if(debugMode){
		segmentSize = 1;
	}

	var groups = _.map(
		distinctHeights,
		function(item, index){
	  		return index % segmentSize === 0 ? distinctHeights.slice(index, index + segmentSize) : null;
	  	}
	).filter(
		function(item){
			return item;
		}
	);

	return groups;
}

Game.prototype._getDistinctHeights = function(mapArray){

	var distinctHeights = {};

	for (var y = 0; y < mapArray.length; y++) {
		for (var x = 0; x < mapArray[y].length; x++) {
			distinctHeights[mapArray[y][x]] = 1;
		}
	}

	var sortedHeights = Object.keys(distinctHeights).sort();
	return sortedHeights;
}

Game.prototype._getMapArrayCoalescedAndTransformedIntoGivenParameters = function(mapArray, arrayOfStringsToMapInto, defaultString){

	var desiredNumSegments;
	var debugMode = 0;
	if(arrayOfStringsToMapInto == undefined){
		desiredNumSegments = 1;
		debugMode = 1;
		arrayOfStringsToMapInto = [];
		defaultString = "#ff0000";
	}else{
		desiredNumSegments = arrayOfStringsToMapInto.length;
	}

	var groupedDistinctHeights = this._coalesceMapHeightsIntoSequentialValues(mapArray, desiredNumSegments, debugMode);
	var numDistinctValues = groupedDistinctHeights.length;

	//Create a lookup table for our heights
	var colorIndicesByHeight = {};
	_.forEach(groupedDistinctHeights, function(heightArray, idx){

		_.forEach(heightArray, function(height){
			colorIndicesByHeight[height] = idx;
		});

	});

	var hexVal;
	var i;
	var newArray = [];
	var heightVal;
	var newValue;

	if(debugMode){ //We're assuming we're not going to have more than 255 different heights...
		var stepValue = Math.floor( 255 / numDistinctValues );

		for(i = 0; i < 255; i+=stepValue){
			hexVal = i.toString(16);
			if(hexVal.length == 1){
				hexVal = "0" + hexVal;
			}
			arrayOfStringsToMapInto.push("#" + hexVal + hexVal + hexVal);
		}
	}

	var heights = Object.keys(arrayOfStringsToMapInto);
	for (var h = 0; h < mapArray.length; h++) {
		for (var w = 0; w < mapArray[h].length; w++) {
			heightVal = mapArray[h][w];
			newValue = ( arrayOfStringsToMapInto[colorIndicesByHeight[heightVal]] != undefined ) ? arrayOfStringsToMapInto[colorIndicesByHeight[heightVal]] : defaultString ;
			
			if( newArray[h] == undefined ){
				newArray[h] = [];
			}

			newArray[h][w] = { mappedValue : newValue, height : heightVal, row : h, column : w };
		}
	}
	return newArray;
}

Game.prototype._getMinAndMaxHeights = function(mapArray){
	var minHeight;
	var maxHeight;
	var heightVal;

	for (var h = 0; h < mapArray.length; h++) {
		for (var w = 0; w < mapArray[h].length; w++) {
			heightVal = mapArray[h][w];
			if(minHeight == undefined && maxHeight == undefined){
				minHeight = heightVal;
				maxHeight = heightVal;
			}

			if(heightVal < minHeight){
				minHeight = heightVal;
			}

			if(heightVal > maxHeight){
				maxHeight = heightVal;
			}
		}
	}

	return [minHeight, maxHeight];
}

Game.prototype._TESTLOGMAP = function(mapArray){
	for (var h = 0; h < mapArray.length; h++) {
		console.log(mapArray[h].join(" "));
	}
}

Game.prototype.setActiveCell = function(row, column){
	var mapCell = this.gameMap().getCell(row, column);
	var hasSufficientMaterials = this.hasSufficientBuildingMaterialsForBuildingType(this.getBuildingTypeForCellTerrainType(mapCell.terrain_type));
	var activeCell = $.extend(mapCell, { has_sufficient_building_materials : hasSufficientMaterials });
	this.currentlySelectedCell(activeCell);
}

Game.prototype.getDisplayedTerrainTypeForActiveCell = function(){
	return this.currentlySelectedCell().terrain_type;
}

Game.prototype.getDisplayedTimeFromBaseForActiveCell = function(){
	return this.gameMap().distanceFromBase(this.currentlySelectedCell()) + " Hours";
}

Game.prototype.getResourceTypeForCellTerrainType = function(cell){
	cell = cell || this.currentlySelectedCell();

	var resourcesByTerrainType = {
		"water" : "fish",
		"sand" : "sand",
		//"grassland",
		"woods" : "lumber",
		"mountain" : "stone",
	};

	return resourcesByTerrainType[cell.terrain_type];
}

Game.prototype.getBuildingTypeForCellTerrainType = function(terrainType){
	var buildingsByTerrainType = {
		//"water" : "fish",
		//"sand" : "sand",
		"grassland" : "farm",
		//"woods" : "lumber",
		//"mountain" : "stone",
	};
	return buildingsByTerrainType[terrainType];
}

Game.prototype.hasSufficientBuildingMaterialsForBuildingType = function(buildingType){
	if(buildingType == undefined){
		return false;
	}
	var self = this;
	var buildingMaterialRequirementsByBuildingType = this.getRequiredBuildingMaterials();
	var hasSufficientMaterials = true;

	_.forEach(Object.keys(buildingMaterialRequirementsByBuildingType[buildingType]), function(materialType){
		if(self.resources()[materialType] >= buildingMaterialRequirementsByBuildingType[buildingType][materialType]){
			return true;
		}else{
			hasSufficientMaterials = false;
			return false;
		}
	});
	return hasSufficientMaterials;
}

Game.prototype.getRequiredBuildingMaterials = function(buildingType){
	var buildingMaterialRequirementsByBuildingType = {
		farm : {
			timber : 10,
			stone : 10,
			scrap : 2,
			tools : 1,
		}
	};

	if(buildingType != undefined && buildingMaterialRequirementsByBuildingType[buildingType] != undefined){
		return buildingMaterialRequirementsByBuildingType[buildingType];
	}
	return buildingMaterialRequirementsByBuildingType;
}

//End map functions

Game.prototype.getDisplayedNameForSettlerJobType = function(jobType){
	return jobType.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

Game.prototype.addSettlersToJob = function(jobObject, event){
	if(this.availableSettlers() == 0 || (jobObject.maxSettlers != undefined && jobObject.numSettlers == jobObject.maxSettlers)){
		return false;
	}
	var settlerJobs = this.settlerJobs();
	var jobKey = jobObject.job;
	//This is necessary otherwise we'd be updating the "jobKey" property as opposed to the property name stored in jobKey
	var updatedJobObject = {};
	updatedJobObject[jobKey] = settlerJobs[jobKey] + 1;
	this._updateObservableProp(this.settlerJobs, updatedJobObject);
	this.availableSettlers( this.availableSettlers() - 1 );
}

Game.prototype.removeSettlersFromJob = function(jobObject, event){
	if(jobObject.numSettlers == 0){
		return false;
	}
	var settlerJobs = this.settlerJobs();
	var jobKey = jobObject.job;
	//This is necessary otherwise we'd be updating the "jobKey" property as opposed to the property name stored in jobKey
	var updatedJobObject = {};
	updatedJobObject[jobKey] = settlerJobs[jobKey] - 1;
	this._updateObservableProp(this.settlerJobs, updatedJobObject);
	this.availableSettlers( this.availableSettlers() + 1 );
}

Game.prototype.gameOver = function(){
	console.log('No settlers left.');
	this.pauseMainTimer();
	this.isGameOver = 1;
}

Game.prototype.newGame = function() {

	var self = this;
	var maps = [];

	//$("#loading").show();

	//Hide the start game buttons
	this._hideOneElemAndShowAnother(
		"#newgame-content",
		"#loading",
		300,
		300
	).then(function(){
		return new Promise(function(resolve, reject){
			//Show the loading symbol
			for(var i = 0; i < 6; i++){
				maps.push(game.generateHeightMapUsingParticleDepositionAlgorithm({
					width : 50,
					height : 50,
					numberOfDropPoints : 10,
					minParticlesPerPoint : 1,
					maxParticlesPerPoint : 1,
					numPasses : 10,
					minRadiusToLookForLowerNeighbors : 1,
					maxRadiusToLookForLowerNeighbors : 1,
					numBlurPasses : 2,
					edgePadding : 5
				}));
			}
			self.newGameGeneratedMaps(maps);
			resolve();
		});
	}).then(function(){
		return self._hideOneElemAndShowAnother(
			"#loading",
			"#intro-content",
			0,
			300
		)
	}).then(function(){
		return self.revealText("#intro-s1-p1", 0, 0); //3000, 0
	}).then(function(){
		return self.revealText("#intro-s1-p2", 0, 0); //3000, 2000
	}).then(function(){
		$("#intro-s1-buttons").fadeIn(0); //500
	});
}

Game.prototype._setupDefaultTimeEvents = function(){
	var self = this;
	_.forEach( [7, 12, 18], function(hour){
		self.hourlyEvents[hour] = $Utils.pushOntoArray(self.hourlyEvents[hour], "consumeFoodEvent" );
	});
	_.forEach( [12, 18], function(hour){
		self.hourlyEvents[hour] = $Utils.pushOntoArray(self.hourlyEvents[hour], "processScavengingEvent" );
	});
	for(var i = 8; i < 18; i++){
		self.hourlyEvents[i] = $Utils.pushOntoArray(self.hourlyEvents[i], "processConstructionEvent" );
	}
	for(var i = 8; i < 18; i+=2){
		self.hourlyEvents[i] = $Utils.pushOntoArray(self.hourlyEvents[i], "processFarmingEvent" );
	}
}

Game.prototype._getDefaultResources = function(){
	return {
		food : 105,
		timber : 50,
		stone : 50,
		scrap : 20,
		tools : 10,
	};
}

Game.prototype._translateTerrainTypeIntoColor = function(cell){

	var mappedTerrainTypesToColors = {
		"water" : "#0004E3", //blue
		"sand" : "#D0E300", //yellow
		"grassland" : "#56C656", //l green
		"woods" : "#0a9000", //d green
		"mountain" : "#8C8C8C", //gray
	};

	var mappedContainsToColors = {
		"hq" : "#F29057",
		"farm" : "#6d4127",
	}

	/*if(this.isDebugMode){
		return "#FFFFFF";
	}*/

	if(cell.improvement_type != undefined){
		return (mappedContainsToColors[cell.improvement_type] != undefined) ? mappedContainsToColors[cell.improvement_type] : "#ffffff" ;
	}

	return (mappedTerrainTypesToColors[cell.terrain_type] != undefined) ? mappedTerrainTypesToColors[cell.terrain_type] : "#ffffff" ;
}

Game.prototype.continueIntroFrom = function(slideName){

	var self = this;

	var slowSpeed = game.isDebugMode ? 0 : 3000;
	var medSpeed = game.isDebugMode ? 0 : 2000;
	var fastSpeed = game.isDebugMode ? 0 : 1000;

	if(slideName == "s1"){
		
		this.fadeOutDiv(
			"#intro-s1",
			(game.isDebugMode ? 0 : 600)
		).then(function(){
			$("#intro-s2").show();
			return self.revealText("#intro-s2-p1", slowSpeed, 0); //3000, 0
		}).then(function(){
			return self.revealText("#intro-s2-p2", slowSpeed, fastSpeed); //3000, 1000
		}).then(function(){
			$("#intro-s2-buttons").fadeIn(500); //500
		});

	} else if(slideName == "s2"){

		var leadersToChooseFrom = this.leadersToChooseFrom();
		var selectedLeaderIdx = this.selectedLeaderIdx();
		this.wordForSettlersSingle = leadersToChooseFrom[selectedLeaderIdx].wordForSettlersSingle;
		this.wordForSettlersPlural = leadersToChooseFrom[selectedLeaderIdx].wordForSettlersPlural;
		
		this.fadeOutDiv(
			"#intro-s2",
			(game.isDebugMode ? 0 : 600)
		).then(function(){
			$("#intro-s3").show();
			return self.revealText("#intro-s3-p1", slowSpeed, 0); //3000, 0
		}).then(function(){
			return self.revealText("#intro-s3-p2", slowSpeed, fastSpeed); //3000, 1000
		}).then(function(){
			return self.revealText("#intro-s3-p3", fastSpeed, medSpeed); //1000, 2000
		}).then(function(){
			$("#intro-s3-buttons").fadeIn((game.isDebugMode ? 0 : 500)); //500
		});

	} else if(slideName == "s3"){
		
		this.fadeOutDiv(
			"#intro-s3",
			(game.isDebugMode ? 0 : 600)
		).then(function(){
			var gameMap = new GameMap( { cellArray : self.newGameGeneratedMaps()[self.selectedMapIdx()] } );
			gameMap.chooseRandomStart();
			self.gameMap(gameMap);
			self.gameMapRows(self.gameMap().rows());
			gameMap = undefined;
			$("#game-time-stats").show();
			$("#intro-s4").show();
			return self.revealText("#intro-s4-p1", slowSpeed, 0); //3000, 0
		}).then(function(){
			return self.revealText("#intro-s4-p2", slowSpeed, fastSpeed); //3000, 1000
		}).then(function(){
			$("#intro-s4-buttons").fadeIn((game.isDebugMode ? 0 : 500)); //500
		});

	} else if(slideName == "s4"){
		
		this.fadeOutDiv(
			"#intro-s4",
			(game.isDebugMode ? 0 : 600)
		).then(function(){
			$("#onecol-row").hide();
			$("#twocol-row").show();
			return self.revealText("#twocol-left", slowSpeed, 0); //3000, 0
		}).then(function(){
			return self.revealText("#twocol-right", slowSpeed, fastSpeed); //3000, 1000
		}).then(function(){
			self.introCompleted = 1;
			self.spcAction();
		});

	}
}

Game.prototype.getLeaderTextFor = function(phase) {
	var leadersToChooseFrom = this.leadersToChooseFrom();
	var selectedLeaderIdx = this.selectedLeaderIdx();
	if(selectedLeaderIdx > -1){
		return leadersToChooseFrom[selectedLeaderIdx].textStages[phase];
	}else{
		return "";
	}
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

/*
Lighten/darken map depending on time of day!!
	-- Possibly could do it by adjusting opacity and putting the appropriate color background behind the map?
*/