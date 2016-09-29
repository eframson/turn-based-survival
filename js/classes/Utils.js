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