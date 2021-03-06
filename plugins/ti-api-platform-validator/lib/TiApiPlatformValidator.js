/**
 * <p>Copyright (c) 2009-2013 by Appcelerator, Inc. All Rights Reserved.
 * Please see the LICENSE file for information about licensing.</p>
 *
 * This plugin finds the Titanium APIs that are used that are not supported on the current platform
 *
 * @module plugins/TiApiPlatformValidator
 */

var path = require('path'),
	Runtime = require(path.join(global.titaniumCodeProcessorLibDir, 'Runtime')),
	CodeProcessorUtils = require(path.join(global.titaniumCodeProcessorLibDir, 'CodeProcessorUtils')),

	pluralize = CodeProcessorUtils.pluralize,

	results,
	renderData;

// ******** Helper Methods ********

/**
 * Generates the raw results data for this plugin
 *
 * @private
 */
function generateResultsData() {
	var summary,
		numInvalidAPIs = Object.keys(results.invalidAPIs).length;

	// Generate the results data
	if (numInvalidAPIs) {
		summary = pluralize('%s platform API is', '%s platform APIs are', numInvalidAPIs) + ' used incorrectly';
	} else {
		summary = 'No platform specific APIs are used incorrectly';
	}
	results.summary = summary;
}

/**
 * Generates the render data for this plugin. This is typically an abstracted version of the raw results, carefully
 * modified to match the requirements of the render templates
 *
 * @private
 */
function generateRenderData() {
	var numInvalidAPIs = Object.keys(results.invalidAPIs).length,
		invalidAPIs,
		numInvalidAPIReferences = 0,
		numInvalidAPIInstances = 0,
		invalidAPI,
		list;

	function apiComparator(a, b) {
		return a.api.toUpperCase().localeCompare(b.api.toUpperCase());
	}

	// Generate the render data
	if (numInvalidAPIs) {
		invalidAPIs = {
			list: []
		};
		list = invalidAPIs.list;
		for (invalidAPI in results.invalidAPIs) {
			list.push({
				api: invalidAPI,
				numReferences: Object.keys(results.invalidAPIs[invalidAPI].locations).length,
				numInstances: results.invalidAPIs[invalidAPI].numInstances
			});
			numInvalidAPIInstances += results.invalidAPIs[invalidAPI].numInstances;
			numInvalidAPIReferences += Object.keys(results.invalidAPIs[invalidAPI].locations).length;
		}
		list.sort(apiComparator);
		if (numInvalidAPIs === 1) {
			numInvalidAPIs = '1 platform-specific API is';
		} else {
			numInvalidAPIs = numInvalidAPIs + ' platform-specific APIs are';
		}
		if (numInvalidAPIReferences === 1) {
			numInvalidAPIReferences = '1 place';
		} else {
			numInvalidAPIReferences = numInvalidAPIReferences + ' places';
		}
		if (numInvalidAPIInstances === 1) {
			numInvalidAPIInstances = '1 time';
		} else {
			numInvalidAPIInstances = numInvalidAPIInstances + ' times';
		}
	}
	renderData = {
		pluginDisplayName: exports.displayName,
		numAPIs: numInvalidAPIs,
		numReferences: numInvalidAPIReferences,
		numInstances: numInvalidAPIInstances,
		invalidAPIs: invalidAPIs
	};
}

// ******** Plugin API Methods ********

/**
 * Initializes the plugin
 *
 * @method module:plugins/TiApiPlatformValidator.init
 * @param {Object} options The plugin options
 * @param {Array.<Object>} dependencies The dependant plugins of this plugin
 */
exports.init = function init(options, dependencies) {
	var i, len,
		platform;
	for (i = 0, len = dependencies.length; i < len; i++) {
		if (dependencies[i].name === 'ti-api-provider') {
			platform = dependencies[i].platform;
		}
	}

	results = {
		summary: '',
		invalidAPIs: {}
	};

	Runtime.on('tiPropertyReferenced', function(e) {
		var platformList = e.data.node.userAgents,
			location = e.filename + ':' + e.line + ':' + e.column,
			i, len,
			isSupported = false,
			name = e.data.name,
			invalidAPI;

		// Global nodes don't have platform lists
		if (!platformList) {
			return;
		}
		for (i = 0, len = platformList.length; i < len; i++) {
			if (platform === platformList[i].platform) {
				isSupported = true;
			}
		}
		if (!isSupported) {
			Runtime.reportWarning('invalidPlatformReferenced', 'Property "' + name +
				'" is not supported on ' + platform, {
					property: name,
					platform: platform
				});

			invalidAPI = results.invalidAPIs[name];
			if (invalidAPI) {
				invalidAPI.numInstances++;
				if (invalidAPI.locations.hasOwnProperty(location)) {
					invalidAPI.locations[location]++;
				} else {
					invalidAPI.locations[location] = 1;
				}
			} else {
				results.invalidAPIs[name] = {
					numInstances: 1,
					locations: {}
				};
				results.invalidAPIs[name].locations[location] = 1;
			}
		}
	});
	Runtime.on('projectProcessingEnd', function () {
		generateResultsData();
		generateRenderData();
	});
};

/**
 * @typedef {Object} module:plugins/TiApiPlatformValidator.results
 * @property {string} summary A short summary of the results
 * @property {Object.<string, number>} invalidAPIs The platform-specific APIs used incorrectly in the project. Each key
 *		is the name of the platform-specific API used incorrectly, and the value is the count
 */
/**
* Gets the results of the plugin
*
* @method module:plugins/TiApiPlatformValidator.getResults
* @return {module:plugins/TiApiPlatformValidator.results} The results
*/
exports.getResults = function getResults() {
	return results;
};

/**
 * Generates the results template data to be rendered
 *
 * @method module:plugins/TiApiPlatformValidator.getResultsPageData
 * @param {string} entryFile The path to the entrypoint file for this plugin. The template returned MUST have this value
 *		as one of the entries in the template
 * @return {module:CodeProcessor.pluginResultsPageData} The information for generating the template(s)
 */
exports.getResultsPageData = function getResultsPageData(entryFile) {
	var template = {};

	template[entryFile] = {
		template: path.join(__dirname, '..', 'templates', 'tiApiPlatformValidatorTemplate.html'),
		data: renderData
	};

	return template;
};

/**
 * Renders the results data to a log-friendly string
 *
 * @method module:plugins/TiApiPlatformValidator.renderLogOutput
 * @param {module:CodeProcessor.arrayGen} arrayGen Log-friendly table generator
 * @return {string} The rendered data
 */
exports.renderLogOutput = function renderLogOutput(arrayGen) {
	var resultsToLog;
	if (renderData.invalidAPIs) {
		resultsToLog = renderData.numAPIs + ' used ' + renderData.numInstances + '\n\nInvalid Platform-Specific API References\n';
		resultsToLog += arrayGen(['API', 'Num References', 'Num Instances'], renderData.invalidAPIs.list, ['api', 'numReferences', 'numInstances']);
	} else {
		resultsToLog = 'No platform specific APIs are used incorrectly in the project';
	}
	return resultsToLog;
};
