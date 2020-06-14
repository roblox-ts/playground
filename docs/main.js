const PATH_SEP = "/";
const JS_DELIVR = "https://cdn.jsdelivr.net/npm/@rbxts";
const PATH_REFERENCE_REGEX = /^\/\/\/ <reference path="([^"]+)" \/>\s*$/gm;

const worker = new Worker("bundle.js");
const loaded = new Set();

function pathJoin(...parts) {
	let result = parts[0];
	for (let i = 1; i < parts.length; i++) {
		if (!result.endsWith(PATH_SEP)) {
			result += PATH_SEP;
		}
		result += parts[i];
	}
	return result;
}

function pathResolve(path) {
	const pathParts = path.split(PATH_SEP);
	const result = [];
	for (let i = 0; i < pathParts.length; i++) {
		if (pathParts[i] === ".") continue;
		if (pathParts[i] === "..") {
			result.pop();
			continue;
		}
		result.push(pathParts[i]);
	}
	return result.join(PATH_SEP);
}

function getMatches(regex, str) {
	const result = [];
	for (const match of str.matchAll(regex)) {
		result.push(match[1]);
	}
	return result;
}

async function urlGet(url) {
	let text = "";
	for (let i = 0; i < 3; i++) {
		const res = await fetch(url);
		if (res.status === 404) {
			console.log(`Failed to load "${url}" ( Attempt #${i} )`);
		} else {
			text = await res.text();
			break;
		}
	}
	return text;
}

async function addFile(packageName, typingsPath, fileUrl) {
	if (!loaded.has(fileUrl)) {
		loaded.add(fileUrl);
		const fileContent = await urlGet(fileUrl);

		await Promise.all(
			getMatches(PATH_REFERENCE_REGEX, fileContent).map((match) =>
				addFile(packageName, typingsPath, pathResolve(pathJoin(fileUrl, "..", match))),
			),
		);

		const path = "@rbxts" + fileUrl.substr(JS_DELIVR.length);

		worker.postMessage({
			type: "writeFile",
			filePath: "/node_modules/" + path,
			content: fileContent,
		});

		monaco.languages.typescript.typescriptDefaults.addExtraLib(fileContent, path);

		if (path === typingsPath) {
			const fakeTypesPath = `@rbxts/${packageName}/index.d.ts`;
			if (path !== fakeTypesPath) {
				monaco.languages.typescript.typescriptDefaults.addExtraLib(fileContent, fakeTypesPath);
			}
		}
	}
}

async function addPackage(packageName) {
	const packageUrl = pathJoin(JS_DELIVR, packageName);
	const pkgJsonText = await urlGet(pathJoin(packageUrl, "package.json"));
	const pkgJson = JSON.parse(pkgJsonText);

	worker.postMessage({
		type: "writeFile",
		filePath: `/node_modules/@rbxts/${packageName}/package.json`,
		content: pkgJsonText,
	});

	const typesRelative = pkgJson.types || pkgJson.typings || "index.d.ts";
	const typesUrl = pathJoin(packageUrl, typesRelative);
	console.log(pkgJson.name, pkgJson.version);
	await addFile(packageName, pathJoin("@rbxts", packageName, typesRelative), typesUrl);
}

async function main() {
	const compilerOptions = {
		allowNonTsExtensions: true,
		allowSyntheticDefaultImports: true,
		downlevelIteration: true,
		module: monaco.languages.typescript.ModuleKind.CommonJS,
		moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
		noLib: true,
		strict: true,
		target: monaco.languages.typescript.ScriptTarget.ES2015,
		typeRoots: ["node_modules/@rbxts"],
		noEmit: true,

		baseUrl: ".",
		rootDir: ".",

		jsx: monaco.languages.typescript.JsxEmit.React,
		jsxFactory: "Roact.createElement",
	};

	const sharedEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		theme: "vs-dark",
	};

	const State = {
		inputModel: null,
		outputModel: null,
	};

	let inputEditor;

	function createFile() {
		return monaco.Uri.file("input.tsx");
	}

	window.UI = {
		tooltips: {},

		shouldUpdateHash: false,

		showFlashMessage(message) {
			const node = document.querySelector(".flash");
			const messageNode = node.querySelector(".flash__message");

			messageNode.textContent = message;

			node.classList.toggle("flash--hidden", false);
			setTimeout(() => {
				node.classList.toggle("flash--hidden", true);
			}, 1000);
		},

		toggleSpinner(shouldShow) {
			document.querySelector(".spinner").classList.toggle("spinner--hidden", !shouldShow);
		},

		selectExample: async function (exampleName) {
			try {
				const res = await fetch(`${window.CONFIG.baseUrl}examples/${exampleName}`);
				let code = await res.text();
				code = code.replace(/export {\s*};/g, "");
				UI.shouldUpdateHash = false;
				State.inputModel.setValue(code.trim());
				location.hash = `example/${exampleName}`;
				UI.shouldUpdateHash = true;
			} catch (e) {
				console.log(e);
			}
		},

		setCodeFromHash: async function () {
			if (location.hash.startsWith("#example")) {
				const exampleName = location.hash.replace("#example/", "").trim();
				UI.selectExample(exampleName);
			}
		},

		refreshOutput() {
			UI.shouldUpdateHash = false;
			State.inputModel.setValue(State.inputModel.getValue());
			UI.shouldUpdateHash = true;
		},

		updateURL() {
			const hash = `code/${LZString.compressToEncodedURIComponent(State.inputModel.getValue())}`;
			window.history.replaceState({}, "", `${window.CONFIG.baseUrl}#${hash}`);
		},

		getInitialCode() {
			if (location.hash.startsWith("#code")) {
				const code = location.hash.replace("#code/", "").trim();
				return LZString.decompressFromEncodedURIComponent(code);
			}
			UI.selectExample("lava.ts");
		},
	};

	window.MonacoEnvironment = {
		getWorkerUrl: function (workerId, label) {
			return `worker.js?version=${window.CONFIG.monacoVersion}`;
		},
	};

	UI.toggleSpinner(true);

	await Promise.all([
		addPackage("types"),
		addPackage("services"),
		addPackage("t"),
		addPackage("roact"),
		addPackage("validate-tree"),
		addPackage("yield-for-character"),
	]);

	UI.toggleSpinner(false);

	monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

	State.inputModel = monaco.editor.createModel(UI.getInitialCode(), "typescript", createFile());

	State.outputModel = monaco.editor.createModel("", "lua", monaco.Uri.file("output.lua"));

	monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

	inputEditor = monaco.editor.create(
		document.getElementById("input"),
		Object.assign({ model: State.inputModel }, sharedEditorOptions),
	);

	monaco.editor.create(
		document.getElementById("output"),
		Object.assign({ model: State.outputModel, readOnly: true }, sharedEditorOptions),
	);

	function updateOutput() {
		const tsSource = State.inputModel.getValue();
		worker.postMessage({
			type: "compile",
			source: tsSource,
		});

		if (UI.shouldUpdateHash) {
			UI.updateURL();
		}
	}

	worker.addEventListener("message", (e) => {
		State.outputModel.setValue(e.data.source);
	});

	UI.setCodeFromHash();

	updateOutput();

	let timer;
	inputEditor.onDidChangeModelContent(() => {
		if (timer !== undefined) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			updateOutput();
		}, 300);
	});
	UI.shouldUpdateHash = true;

	inputEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KEY_F, prettier);

	// if the focus is outside the editor
	window.addEventListener(
		"keydown",
		(event) => {
			const S_KEY = 83;
			if (event.keyCode == S_KEY && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();

				window.clipboard.writeText(location.href.toString()).then(
					() => UI.showFlashMessage("URL is copied to the clipboard!"),
					(e) => {
						alert(e);
					},
				);
			}
		},
		false,
	);

	function prettier() {
		const PRETTIER_VERSION = "2.0.5";

		require([
			`https://cdn.jsdelivr.net/npm/prettier@${PRETTIER_VERSION}/standalone.js`,
			`https://cdn.jsdelivr.net/npm/prettier@${PRETTIER_VERSION}/parser-typescript.js`,
		], function (prettier, { parsers }) {
			const cursorOffset = State.inputModel.getOffsetAt(inputEditor.getPosition());

			const formatResult = prettier.formatWithCursor(State.inputModel.getValue(), {
				parser: parsers.typescript.parse,
				printWidth: 120,
				tabWidth: 4,
				useTabs: true,
				trailingComma: "all",
				cursorOffset,
			});

			State.inputModel.setValue(formatResult.formatted);
			const newPosition = State.inputModel.getPositionAt(formatResult.cursorOffset);
			inputEditor.setPosition(newPosition);
		});
	}
}
