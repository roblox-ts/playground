const path = require("path");

module.exports = {
	target: "web",
	entry: {
		bundle: path.join(__dirname, "docs", "rbxts.js")
	},
	output: {
		filename: "bundle.js",
		path: path.join(__dirname, "docs")
	},
	node: {
		fs: "empty",
		module: "empty"
	},
	externals: {
		"cross-spawn": "{}",
		"fs-extra": "{}",
		chokidar: "{}",
		klaw: "{}",
		luamin: "{}",
		net: "{}",
		tls: "{}",
		yargs: "{}",
		"@microsoft/typescript-etw": "new Proxy({}, { get: () => () => {} })"
	},
	performance: { hints: false },
	mode: "production"
};
