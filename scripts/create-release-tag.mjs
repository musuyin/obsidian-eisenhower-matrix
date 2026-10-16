import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: process.cwd(),
		encoding: 'utf8',
		...options,
	});
	if (result.error) throw result.error;
	return result;
}

function output(result) {
	return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function fail(message) {
	console.error(`Release tag failed: ${message}`);
	process.exit(1);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function listReleaseTags() {
	const remoteTags = run('git', ['ls-remote', '--tags', '--refs', 'origin']);
	if (remoteTags.status !== 0) fail(`could not list release tags from origin.\n${output(remoteTags)}`);

	const tags = remoteTags.stdout
		.split('\n')
		.map((line) => line.split('\t')[1]?.replace('refs/tags/', ''))
		.filter((tag) => tag && semverPattern.test(tag))
		.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));

	console.log(tags.length ? `Current release tags: ${tags.join(', ')}` : 'Current release tags: none');
}

const [tag, ...extraArguments] = process.argv.slice(2);
if (!tag || extraArguments.length > 0) {
	listReleaseTags();
	fail('provide exactly one Semantic Version tag: npm run release:tag -- <tag>.');
}
if (!semverPattern.test(tag)) fail(`"${tag}" is not a valid Semantic Version tag.`);

const status = run('git', ['status', '--porcelain']);
if (status.status !== 0) fail(`could not inspect the working tree.\n${output(status)}`);
if (status.stdout.trim()) fail('working tree must be clean before creating a release tag.');

const branch = run('git', ['branch', '--show-current']);
if (branch.status !== 0 || !branch.stdout.trim()) fail('HEAD must be attached to the main branch.');
if (branch.stdout.trim() !== 'main') fail(`release tags must be created from main, not ${branch.stdout.trim()}.`);

const localHead = run('git', ['rev-parse', 'HEAD']);
const remoteMain = run('git', ['ls-remote', 'origin', 'refs/heads/main']);
if (localHead.status !== 0 || remoteMain.status !== 0) fail(`could not verify main against origin.\n${output(remoteMain)}`);
const remoteMainSha = remoteMain.stdout.trim().split(/\s+/)[0];
if (!remoteMainSha) fail('origin does not have a main branch.');
if (localHead.stdout.trim() !== remoteMainSha) fail('local main must exactly match origin/main before creating a release tag.');

const packageJson = readJson('package.json');
if (packageJson.version !== tag) fail(`tag "${tag}" must exactly match package.json version "${packageJson.version}".`);

const metadata = run('npm', ['run', 'validate:release'], {
	env: { ...process.env, RELEASE_TAG: tag },
});
if (metadata.status !== 0) fail(`release metadata validation did not pass.\n${output(metadata)}`);

const localTag = run('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
if (localTag.status === 0) fail(`local tag "${tag}" already exists.`);

const remoteTag = run('git', ['ls-remote', '--tags', '--refs', 'origin', `refs/tags/${tag}`]);
if (remoteTag.status !== 0) fail(`could not check whether tag "${tag}" exists on origin.\n${output(remoteTag)}`);
if (remoteTag.stdout.trim()) fail(`remote tag "${tag}" already exists.`);

const createTag = run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
if (createTag.status !== 0) fail(`could not create tag "${tag}".\n${output(createTag)}`);

const pushTag = run('git', ['push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
if (pushTag.status !== 0) {
	console.error(`Release tag "${tag}" was created locally but was not pushed.\n${output(pushTag)}`);
	process.exit(1);
}

console.log(`Created and pushed release tag ${tag}.`);
