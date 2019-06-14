import { Project } from "roblox-ts";
const project = new Project();

global.compileSource = source => {
	return project.compileSource(source);
};

global.registerLib = (name, source) => {
	project.project.createSourceFile(name, source);
};
