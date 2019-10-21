const dbus = require('dbus-native');

const sessionBus = dbus.sessionBus();
if (!sessionBus) throw new Error('Could not connect to session bus');

sessionBus.requestName('opl.KRunnerJSEval', 0x04, (err, code) => {
	if (err) throw new Error(err);

	if (code === 3) throw new Error(`Another instance is already running`);
	if (code !== 1) throw new Error(`Received code ${code} while requesting service name "opl.KRunnerJSEval"`);
});

module.exports.createKRunnerInterface = function({path, actionsHandler, runHandler, matchHandler}) {
	// Interface definition from https://github.com/KDE/krunner/blob/master/src/data/org.kde.krunner1.xml

	const interface = {};
	const interfaceDesc = {
		name: 'org.kde.krunner1',
		methods: {},
	};

	if (actionsHandler) {
		interface.Actions = actionsHandler;
		interfaceDesc.methods.Actions = ['', 'a(sss)', [], ['matches']];
	}

	if (runHandler) {
		interface.Run = runHandler;
		interfaceDesc.methods.Run = ['ss', '', ['matchId', 'actionId'], []];
	}

	if (matchHandler) {
		interface.Match = matchHandler;
		interfaceDesc.methods.Match = ['s', 'a(sssida{sv})', ['query'], ['matches']];
	}

	sessionBus.exportInterface(interface, path, interfaceDesc);
}
