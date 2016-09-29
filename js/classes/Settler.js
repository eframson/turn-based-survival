/**
 * Represents a settler
 * @constructor
 * @param {object} data - All the init data
 */
var Settler = function(data) {
	Person.call(this, data);

	data = data || {};

	this.tribe = data.tribe;
};
Settler.prototype = Object.create(Person.prototype);
Settler.prototype.constructor = Settler;

Settler.prototype.init = function(data){
	data = data || {};

	this.tribe = data.tribe;
}

