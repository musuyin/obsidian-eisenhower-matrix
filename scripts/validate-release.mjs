import { readFileSync } from 'node:fs';

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
	console.error(`Release validation failed: ${message}`);
	process.exit(1);
}

const packageJson = readJson('package.json');
const manifest = readJson('manifest.json');
const versions = readJson('versions.json');

if (!semverPattern.test(packageJson.version)) fail(`package.json version "${packageJson.version}" is not valid SemVer.`);
if (manifest.version !== packageJson.version) {
	fail(`manifest.json version "${manifest.version}" must match package.json version "${packageJson.version}".`);
}
if (typeof manifest.minAppVersion !== 'string' || !semverPattern.test(manifest.minAppVersion)) {
	fail(`manifest.json minAppVersion "${manifest.minAppVersion}" is not valid SemVer.`);
}
if (versions[manifest.version] !== manifest.minAppVersion) {
	fail(`versions.json must map version "${manifest.version}" to minAppVersion "${manifest.minAppVersion}".`);
}

const tag = process.env.RELEASE_TAG;
if (tag && tag !== manifest.version) {
	fail(`release tag "${tag}" must exactly match manifest.json version "${manifest.version}".`);
}

console.log(`Release metadata is valid for version ${manifest.version}.`);
