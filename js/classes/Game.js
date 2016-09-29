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

	//Observables
	this.availableSettlers = ko.observable(data.availableSettlers || 0);
	this.workingSettlers = ko.observable(data.workingSettlers || 0);
	this.busySettlers = ko.observable(data.busySettlers || 0);
	this.resources = ko.observable(data.resources || {});
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

	this.somePerson = new Person({ name : 'Bob' });
	this.someSettler = new Settler({ name : 'Jeff', tribe : 'Umpqua' });
}

//Update existing props on an existing observable and add new ones
Game.prototype._updateObservableProp = function(obs, newData, clearUnusedKeys, addNewKeys) {

	if( !ko.isObservable(obs) ){
		console.log("_updateObservableProp requires an observable as its first argument");
		return false;
	}

	clearUnusedKeys 	= Utils.setDefaultValue(clearUnusedKeys, 0);
	addNewKeys 			= Utils.setDefaultValue(addNewKeys, 1);
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

Game.prototype.mainLoop = function() {

	var currentHour = this.currentHour;
	var currentDay = this.currentDay;
	var currentSeasonIdx = this.currentSeasonIdx;

	this.hourCounter++;
	this.currentHour = this.hourCounter % 24;
	document.getElementById("current-hour").innerHTML = this.currentHour;

	if(this.currentHour == 0){
		this.dayCounter++;
		this.currentDay = this.dayCounter % 30;
		document.getElementById("current-day").innerHTML = this.currentDay;

		if(this.currentDay == 0){
			this.seasonCounter++;
			this.currentSeasonIdx = this.seasonCounter % 4;
			this.currentSeason = this.seasons[this.currentSeasonIdx];
			document.getElementById("current-season").innerHTML = this.currentSeason;

			if(this.currentSeasonIdx == 0){
				this.yearCounter++;
				document.getElementById("current-year").innerHTML = this.yearCounter;
			}
		}
	}	
}

Game.prototype.spcAction = function(){
	if(!this.isPopupVisible){
		if(this.isPlaying){
			this.pauseMainTimer();
		}else{
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

//This is just temporary stuff to stop JS errors
Game.prototype.hideModal = function() {
	console.log('foo');
}
Game.prototype.showModalClose = function() {
	console.log('bar');
}
Game.prototype.modalWindowTitle = function() {
	console.log('bar');
}
Game.prototype.modalWindowText = function() {
	console.log('bar');
}
Game.prototype.showModalWindowFooter = function() {
	console.log('bar');
}
Game.prototype.loadGame = function() {
	console.log('bar');
}
Game.prototype.saveGame = function() {
	console.log('bar');
}
Game.prototype.logMessages = function() {
	console.log('bar');
}
Game.prototype.showFaq = function() {
	console.log('bar');
}