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
		"fs-extra": "{}"
	},
	mode: "production"
};
