const params = new URLSearchParams(location.search);

const version = params.get("version");

if (!version) {
	throw new Error(`Pass ?version= to worker.js.`);
}

self.MonacoEnvironment = {
	baseUrl: `https://cdn.jsdelivr.net/npm/monaco-editor@${version}/min`,
};
importScripts(`https://cdn.jsdelivr.net/npm/monaco-editor@${version}/min/vs/base/worker/workerMain.js`);
