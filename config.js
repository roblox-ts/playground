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
		yargs: "{}",
		"universal-analytics": "{}",
		uuid: "{}"
	},
	performance: { hints: false },
	mode: "production"
};
