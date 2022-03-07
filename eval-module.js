const dbus = require('dbus-native');
const util = require('util');
const vm = require('vm');

const {createKRunnerInterface} = require('./dbus-connection');

let currentContext = null;
let lastCode = '';
let reallyEvaling = false;

function delay(time, callback) {
	return new Promise((resolve) => setTimeout(() => resolve(callback()), time));
}

// Notification issuing
let notifyMethod = null;

const sessionBus = dbus.sessionBus();
if (!sessionBus) throw new Error('Failed to connect to the session bus');

sessionBus.getService('org.freedesktop.Notifications').getInterface(
	'/org/freedesktop/Notifications',
	'org.freedesktop.Notifications',
	(err, notifyObject) => {
		if (err) throw new Error(err);

		notifyMethod = notifyObject.Notify.bind(notifyObject);
	},
);

function sendNotification({summary = '', body = '', actions = [], timeout = -1}) {
	notifyMethod(
		'JavaScript Eval',
		0,
		'code-variable',
		summary,
		body,
		actions,
		{},
		timeout,
		(err, notificationID) => {
			if (err) console.error(err);
		},
	);
}

// Clipboard handling
let getClipboardHistoryItemMethod = null;
let setClipboardContentsMethod = null;

sessionBus.getService('org.kde.klipper').getInterface(
	'/klipper',
	'org.kde.klipper.klipper',
	(err, klipperObject) => {
		if (err) throw new Error(err);

		getClipboardHistoryItemMethod = klipperObject.getClipboardHistoryItem.bind(klipperObject);
		setClipboardContentsMethod = klipperObject.setClipboardContents.bind(klipperObject);
		currentContext.clip = getClipboardHistoryItemMethod;
	},
);

function getClipboardItem(index = 0) {
	return new Promise((resolve, reject) => {
		getClipboardHistoryItemMethod(index, (err, content) => {
			if (err) return reject(err);
			resolve(content);
		});
	});
}

function setClipboardContents(value) {
	setClipboardContentsMethod(value);
}

// Sandbox context
const predefinedGlobals = {
	$: undefined,
	Buffer,
	CHARS: {
		alpha: 'abcdefghijklmnopqrstuvwxyz',
		ALPHA: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		num: '0123456789',
		alphanum: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
		base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
	},
	escape,
	encodeURI,
	encodeURIComponent,
	decodeURI,
	decodeURIComponent,
	aA(val) {
		return ('' + val).split('').map((c) => Math.random() < 0.5 ? c : c.toLocaleUpperCase()).join('');
	},
	sum(...args) {
		return [].concat(...args).reduce((acc, v) => acc + parseFloat(v, 10));
	},
	randF(...args) {
		const min = args.length === 1 ? 0 : parseFloat(args[0]);
		const max = parseFloat(args.length === 1 ? args[0] : args[1]);

		return Math.floor(Math.random() * (max - min) + min);
	},
	rand(...args) {
		return Math.floor(predefinedGlobals.randF(...args));
	},
	makeArr(length, callback, ...args) {
		const arr = [];
		for (let i = 0; i < length; i++) arr.push(callback(i, arr, ...args));
		return arr;
	},
	range(start, end, step) {
		if (end === undefined) {
			end = start;
			start = 0;
		}

		if (step === undefined || step === 0) {
			step = Math.sign(end - start);
		}

		const arr = [];
		for (let i = start; step < 0 ? i >= end : i <= end; i += step) arr.push(i);
		return arr;
	},
	log(...args) {
		const value = args.length <= 1 ? args[0] : args;

		if (reallyEvaling) {
			sendNotification({
				summary: 'log()',
				body: util.inspect(value, {
					colors: false,
					compact: true,
					breakLength: 100,
					depth: Infinity,
				}),
			});
		}

		return value;
	},
	copy(...args) {
		const value = args.length <= 1 ? args[0] : args;

		if (reallyEvaling) {
			let valueStr = '';

			if (['string', 'number'].includes(typeof value)) {
				valueStr = `${value}`;
			} else {
				valueStr = JSON.stringify(value);
			}

			setClipboardContents(valueStr);
		}

		return value;
	},
	paste(index = 0) {
		if (typeof index === 'string') index = parseInt(index, 10);

		return getClipboardItem(index);
	},
	require(what) {
		return {
			crypto: () => require('crypto'),
			path: () => require('path'),
			querystring: () => require('querystring'),
			string_decoder: () => require('string_decoder'),
			url: () => require('url'),
		}[what]();
	},
	deg(degrees) {
		return degrees * Math.PI / 180;
	},
	rad(radians) {
		return radians / Math.PI * 180;
	},
	morse(text) {
		const {TO_MORSE, TO_TEXT} = require('./morse');

		// Support usage with string templates
		if (Array.isArray(text)) text = text[0];

		if (/[\.\-]+( \/ [\.\-]+)*/.test(text)) {
			return text.split(' ').map((c) => TO_TEXT[c]).join('');
		} else {
			return text.split('').map((c) => TO_MORSE[c]).join(' ');
		}
	},
};

function deepClone(val, processed = []) {
	if (Array.isArray(val) && !processed.includes(val)) {
		processed.push(val);
		return val.map((v) => deepClone(v, processed));
	} else if (val !== null && typeof val === 'object' && !processed.includes(val)) {
		processed.push(val);
		return Object.entries(val).reduce((acc, [key, value]) => {
			acc[key] = deepClone(value, processed);
			return acc;
		}, {});
	}

	return val;
}

function recreateContext() {
	currentContext = deepClone(predefinedGlobals);
}

recreateContext();

// Command handling
const commands = {
	'new': {
		name: 'Create new context',
		execute() {
			recreateContext();
		},
	},
};

// Code evaluation
async function evalCode(code, context) {
	const result = vm.runInNewContext(code, context, {
		filename: 'krunner.js',
		timeout: 1000,
		breakOnSigint: true,
	});

	// If the returned value is a Promise, resolve it before returning
	const output = await Promise.race([
		delay(2000, () => new Error('Promise resolution timeout')),
		result,
	]);

	return output;
}

// DBus handlers
createKRunnerInterface({
	path: '/opl/KRunnerJSEval/JSEval',
	async runHandler(matchID, actionID) {
		if (matchID === 'js-eval') {
			reallyEvaling = true;

			try {
				const result = await evalCode(lastCode, currentContext);

				// $ stores the result of the last operation
				currentContext.$ = result;
			} catch (ex) {
				console.error(ex);
			}

			reallyEvaling = false;
		} else if (matchID.startsWith('command.')) {
			const command = commands[matchID.substr('command.'.length)];

			if (command && typeof command.execute === 'function') command.execute(matchID, actionID);
		}
	},
	async matchHandler(rawQuery) {
		const parsedQuery = /^>(\>?)(.*?)$/.exec(rawQuery);

		if (!parsedQuery) return [];

		const query = parsedQuery[2];

		// Handle commands
		if (parsedQuery[1]) {
			return Object.entries(commands)
				.filter(([key]) => key.startsWith(query))
				.map(([key, {name, icon}]) => [`command.${key}`, name, icon || 'code-variable', query === key ? 100 : 10, 1, {}]);
		}

		// Handle code evaluation
		if (!query) return [];

		try {
			lastCode = query;

			const result = await evalCode(query, deepClone(currentContext));

			return [['js-eval', util.inspect(result, {
				depth: Infinity,
				breakLength: Infinity,
				compact: true,
				colors: false,
			}), 'code-variable', 70, 1, {}]];
		} catch (ex) {
			return [['js-eval-error', (ex || {}).message || `Unknown error message`, 'code-variable', 50, 1, {}]];
		}
	},
});
