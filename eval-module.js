const dbus = require('dbus-native');
const util = require('util');
const vm = require('vm');

const {createKRunnerInterface} = require('./dbus-connection');

let currentContext = null;
let lastCode = '';
let reallyEvaling = false;

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

// Sandbox context
const predefinedGlobals = {
	$: undefined,
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
	log(...args) {
		const output = args.length === 0 ? undefined : args.length === 1 ? args[0] : args;

		if (!reallyEvaling) return output;

		sendNotification({
			summary: 'log()',
			body: util.inspect(output, {
				colors: false,
				compact: true,
				breakLength: 100,
				depth: Infinity,
			}).replace(/^( +)/g, (match) => match[1].replace(' ', '\u00a0')), // FIXME: doesn't make the indentation show up
		});
	},
};

// FIXME: this is gonna die on any circular dependencies, isn't it...
function deepClone(val) {
	if (Array.isArray(val)) {
		return val.map((v) => deepClone(v));
	} else if (val !== null && typeof val === 'object') {
		return Object.entries(val).reduce((acc, [key, value]) => {
			acc[key] = deepClone(value);
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
function evalCode(code, context) {
	return vm.runInNewContext(code, context, {
		filename: 'krunner.js',
		timeout: 1000,
		breakOnSigint: true,
	});
}

// DBus handlers
createKRunnerInterface({
	path: '/opl/KRunnerJSEval/JSEval',
	runHandler(matchID, actionID) {
		if (matchID === 'js-eval') {
			reallyEvaling = true;

			try {
				const result = evalCode(lastCode, currentContext);

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
	matchHandler(rawQuery) {
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

			const result = evalCode(query, deepClone(currentContext));

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
