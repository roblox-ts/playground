import { Project } from "roblox-ts";

const project = new Project();

addEventListener("message", e => {
	if (e.data.type === "compile") {
		let luaSource;
		try {
			luaSource = project.compileSource("export {};\n" + e.data.source);
		} catch (e) {
			luaSource = `--[[\n${e.toString().replace(/(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]/g, "")}\n]]`;
		}
		postMessage({
			source: luaSource
		});
	} else if (e.data.type === "library") {
		project.project.createSourceFile(e.data.name, e.data.source);
	}
});
