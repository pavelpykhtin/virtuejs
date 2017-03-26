const configuration = require('./tests.json');
const assert = require('assert');
const fs = require('fs');
let client = require('webdriverio').remote({ desiredCapabilities: { browserName: configuration.browserName || 'chrome' } });

const actionOnInvisible = require('./actionsOnInvisible');
client.addCommand('clickHidden', actionOnInvisible.clickHidden, true);
client.addCommand('doubleClickHidden', actionOnInvisible.doubleClickHidden, true);

require('webdrivercss').init(client, {
	screenshotRoot: configuration.screenshotRoot,
	failedComparisonsRoot: configuration.failedComparisonsRoot,
	misMatchTolerance: configuration.misMatchTolerance,
	screenWidth: configuration.screenWidth
});


execute();

function execute() {
	const report = {
		testSuite: configuration.testSuiteName,
		tests: []
	};
	client = setup(client);

	const sections = configuration.sections || [];
	sections.push({name: undefined});

	sections.forEach((s) => {
		const cases = configuration.cases
			.filter((c) => c.section === s.name);

		client = runScript(s.before, client, client, s);

		cases.forEach((c) => {
			for (let key in c)
				c[key] = injectParameters(configuration.params, c[key]);

            const caseName = s.name ? `${s.name}.${c.name}` : c.name;
			client.call(() => console.log(caseName));

			client = runScript(c.before, client, client, c);
			client = navigate(client, c);

			client = runScript(c.waitUntilLoaded || s.waitUntilLoaded, client, client, c);
			
			client = runScript(c.after, client, client, c);
			client = takeShot(client, c, caseName, report);
		});

		client = runScript(s.after, client, client, s);
	});

	client = cleanUp(client);
    
    writeReport(client, report);	
}

function setup(client) {
	return client.init();
}

function navigate(client, testConfig) {
	return client.url(testConfig.url);
}

function takeShot(client, testConfig, caseName, report) {
	const elements = testConfig.elements || [{ name: 'doc', element: 'html > body' }];

	return client
		.pause(testConfig.pauseBeforeShot || 500)
		.webdrivercss(
			testConfig.name,
			elements,
			(err, res) => {
				elements.forEach((el) => {
					console.log(`${el.name}:\t ${res[el.name][0].isWithinMisMatchTolerance ? 'OK' : 'FAILED'}`);
					//console.log(JSON.stringify(res[el.name]));

					const testReport = {
						status: res[el.name][0].isWithinMisMatchTolerance ? 'pass' : 'failed',
						pair: {
                            label: caseName,
							reference: `../${res[el.name][0].baselinePath}`,
							test: `../${res[el.name][0].isExactSameImage ? res[el.name][0].baselinePath : res[el.name][0].regressionPath}`,
							diffImage: `../${res[el.name][0].diffPath}`,
							diff: {
								message: res[el.name][0].message
							}
						}
					};

					report.tests.push(testReport);
				});
			});
}

function cleanUp(client)
{
	return client.end();
}

function runScript(scriptPath, client, ...args) {
	if (!scriptPath)
		return client;

	const script = require(scriptPath);

	return script(...args);
}

function injectParameters(parameters, value) {
	const matchExpression = /\$\{(?:[^\}]+)\}/g;
	let match;

	while (match = matchExpression.exec(value)) {
		const parameterKey = match[0].slice(2, -1);

		if (parameters[parameterKey] === undefined)
			continue;

		value = value.replace(match[0], parameters[parameterKey]);
	}

	return value;
}

function writeReport(client, report){
    client.call(() => {
        fs.writeFile('./compare/config.js', `var t = ${JSON.stringify(report)};report(t);`);
    });
}