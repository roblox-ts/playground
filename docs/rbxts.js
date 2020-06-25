import { VirtualProject } from "roblox-ts";

const project = new VirtualProject();

addEventListener("message", (e) => {
	if (e.data.type === "compile") {
		let luaSource;
		try {
			luaSource = project.compileSource(e.data.source + "\nexport {};");
		} catch (e) {
			luaSource = e
				.toString()
				.replace(/(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]/g, "")
				.split("\n")
				.map((v) => `-- ${v}`)
				.join("\n");
		}
		postMessage({ source: luaSource });
	} else if (e.data.type === "writeFile") {
		project.vfs.writeFile(e.data.filePath, e.data.content);
	}
});
