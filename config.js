const path = require("path");
const webpack = require("webpack");

module.exports = {
	target: "web",
	entry: {
		bundle: path.join(__dirname, "docs", "rbxts.js")
	},
	output: {
		filename: "bundle.js",
		path: path.join(__dirname, "docs")
	},
	plugins: [
		new webpack.ProvidePlugin({ process: ["process"] }),
	],
	resolve: {
		fallback: {
			path: require.resolve("path-browserify"),
			os: require.resolve("os-browserify/browser"),
		},
	},
	externals: {
		fs: "{}",
		module: "{}",
		worker_threads: "{}",
		"cross-spawn": "{}",
		"fs-extra": "{}",
		chokidar: "{}",
		klaw: "{}",
		net: "{}",
		tls: "{}",
		yargs: "{}",
		"@microsoft/typescript-etw": "new Proxy({}, { get: () => () => {} })",
		"universal-analytics": "{}",
		uuid: "{}",
	},
	performance: { hints: false },
	mode: "production",
};
