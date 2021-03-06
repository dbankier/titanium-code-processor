/**
 * <p>Copyright (c) 2009-2013 by Appcelerator, Inc. All Rights Reserved.
 * Please see the LICENSE file for information about licensing.</p>
 *
 * Definition for the error prototype
 *
 * @module base/prototypes/error
 */
/*global
util,
FunctionTypeBase,
areAnyUnknown,
UnknownType,
handleRecoverableNativeException,
type,
StringType,
toString,
addNonEnumerableProperty,
wrapNativeCall
*/

/*****************************************
 *
 * Error Prototype Class
 *
 *****************************************/

/**
 * toString() prototype method
 *
 * @private
 * @see ECMA-262 Spec Chapter 15.11.4.4
 */
function ErrorProtoToStringFunc(className) {
	FunctionTypeBase.call(this, 0, className || 'Function');
}
util.inherits(ErrorProtoToStringFunc, FunctionTypeBase);
ErrorProtoToStringFunc.prototype.callFunction = wrapNativeCall(function callFunction(thisVal, args) {

	// Variable declarations
	var o = thisVal,
		name,
		msg;

	// Validate the parameters
	if (areAnyUnknown((args || []).concat(thisVal))) {
		return new UnknownType();
	}

	// Step 2
	if (type(o) !== 'Object') {
		handleRecoverableNativeException('TypeError', 'Value is not an object');
		return new UnknownType();
	}

	// Steps 3 and 4
	name = o.get('name');
	if (type(name) === 'Undefined') {
		name = new StringType('Error');
	} else {
		name = toString(name);
	}

	// Steps 5 and 6 (and 7, which seems to be a copy-paste error, go figure)
	msg = o.get('message');
	if (type(msg) === 'Undefined') {
		msg = new StringType('');
	} else {
		msg = toString(msg);
	}

	// Steps 8-10
	if (!name.value) {
		return msg;
	} else if (!msg.value) {
		return name;
	} else {
		return new StringType(name.value + ': ' + msg.value);
	}
});

/**
 * @classdesc The prototype for Errors
 *
 * @constructor module:base/prototypes/error.ErrorPrototypeType
 * @see ECMA-262 Spec Chapter 15.11.4
 */
exports.ErrorPrototypeType = ErrorPrototypeType;
function ErrorPrototypeType(errorType, className) {
	FunctionTypeBase.call(this, 0, className);
	this._errorType = errorType;
	addNonEnumerableProperty(this, 'toString', new ErrorProtoToStringFunc(), false, true);
}
util.inherits(ErrorPrototypeType, FunctionTypeBase);
ErrorPrototypeType.instantiateClone = function instantiateClone(source) {
	return new ErrorPrototypeType(source._errorType, source.className);
};