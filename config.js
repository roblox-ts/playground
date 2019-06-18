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
		"cross-spawn": "empty",
		"fs-extra": "empty",
		chokidar: "empty",
		klaw: "empty",
		luamin: "empty",
		yargs: "empty"
	},
	performance: { hints: false },
	mode: "production"
};
