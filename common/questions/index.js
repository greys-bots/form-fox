const attachment = require('./attachment');
const checkbox = require('./checkbox');
const date = require('./date');
const image = require('./image');
const multipleChoice = require('./multipleChoice');
const number = require('./number');
const text = require('./text');

module.exports = {
	att: attachment,
	cb: checkbox,
	dt: date,
	img: image,
	mc: multipleChoice,
	num: number,
	text
}