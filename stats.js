var mod_assert = require('assert-plus');
var mod_crypto = require('crypto');
var mod_util = require('util');

/*
 * stats.js - simple statistics functions
 */

function Stats() {
	this.map = {};
	this.labelMap = {};
}

/*
 * Given a set of metadata labels and a numeric value, add them to the list of
 * metrics observed.
 */
Stats.prototype.observe = function observe(labels, value) {
	mod_assert.object(labels, 'labels');
	mod_assert.number(value, 'value');

	var hash = hashObj(labels);
	if (! this.map[hash]) {
		this.map[hash] = [];
	}

	this.labelMap[hash] = labels;
	this.map[hash].push(value);
};

/*
 * Returns sums of each of the unique label combinations.
 * The user may optionally provide the number of entries to sum.
 *
 * Return value looks like:
 * [
 *  [ label_object, sum ],
 *  [ label_object, sum ],
 *  [ label_object, sum ]
 * ]
 */
Stats.prototype.sum = function sum(count) {
	mod_assert.optionalNumber(count, 'count');
	if (count <= 0) {
		throw new Error('count must be a positive number');
	}
	var self = this;
	var num_to_sum;
	var m_sum;
	var retval = [];
	var i = 0;
	var j = 0;

	Object.keys(this.map).forEach(function (hash) {
		m_sum = 0;
		if (count) {
			num_to_sum = count;
		} else {
			num_to_sum = self.map[hash].length;
		}
		for (i = self.map[hash].length - 1;
		    j < num_to_sum && i >= 0;
		    j++, i--) {
			m_sum += self.map[hash][i];
		}
		retval.push([self.labelMap[hash], m_sum]);
		j = 0;
	});
	return (retval);
};

/*
 * Same as Stats.sum() above, but returns the average.
 *
 * The user may optionally provide the number of entries to average.
 */
Stats.prototype.average = function average(count) {
	mod_assert.optionalNumber(count, 'count');
	var self = this;
	var num_to_avg;
	var sums;
	var retval = [];
	sums = this.sum(count);
	sums.forEach(function (s) {
		if (count > self.map[hashObj(s[0])].length || !count) {
			/* count is bigger than the number of values observed */
			num_to_avg = self.map[hashObj(s[0])].length;
		} else {
			num_to_avg = count;
		}
		retval.push([s[0], s[1] / num_to_avg]);
	});
	return (retval);
};

/*
 * Find the median value from each of the label sets.
 * Returns an array like this:
 * [
 *   [ label_object, median ],
 *   [ label_object, median ]
 * ]
 */
Stats.prototype.median = function median() {
	var self = this;
	var sorted_array;
	var m_median;
	var midpoint;
	var retval = [];

	Object.keys(this.map).forEach(function (hash) {
		sorted_array = self.map[hash].sort();
		midpoint = sorted_array.length / 2;
		if (sorted_array.length % 2 === 1) {
			/* odd elements - round down the mid point */
			m_median = sorted_array[midpoint - 0.5];
		} else {
			/* even elements - take average of middle two points */
			m_median = (sorted_array[midpoint] +
			    sorted_array[midpoint - 1]) / 2;
		}
		retval.push([self.labelMap[hash], m_median]);
	});
	return (retval);
};

/*
 * Convert the label key-value pairs into an md5 string
 */
function hashObj(obj) {
	mod_assert.object(obj, 'obj');
	var hash = mod_crypto.createHash('md5');
	var newObj = {};
	var keys = Object.keys(obj).sort();
	keys.forEach(function (key) {
		newObj[key] = obj[key];
	});
	return (hash.update(JSON.stringify(newObj)).digest('hex'));
}

module.exports = {
	Stats: Stats
};
