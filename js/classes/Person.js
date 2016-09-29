/**
 * Represents a person
 * @constructor
 * @param {object} data - All the init data
 */
var Person = function(data) {
//	this.init(data);
	data = data || {};

	this.name = data.name;
};

Person.prototype.init = function(data){
	data = data || {};

	this.name = data.name;
}