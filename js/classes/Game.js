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
		targetElemOrSelector.css("position", "relative");

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

			setTimeout(function(){
				resolve();
			}, waitInSecondsBeforeReturning);

		});

	});

	return promise;

}

//End utility functions

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