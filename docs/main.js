const worker = new Worker("bundle.js");

const CORE_LIB_BASE = "https://unpkg.com/@rbxts/types@latest";
const CORE_LIB_PATH = `${CORE_LIB_BASE}/include/`;

function joinPath(...parts) {
	let result = [];
	for (const part of parts) {
		for (const subPart of part.split("/").filter(v => v.length > 0)) {
			if (subPart == "..") {
				result.pop();
			} else {
				result.push(subPart);
			}
		}
	}
	return result.join("/");
}

function getReferencePaths(input) {
	const rx = /<reference path="([^"]+)"\s\/>/;
	return (input.match(new RegExp(rx.source, "g")) || []).map(s => {
		const match = s.match(rx);
		if (match && match.length >= 2) {
			return match[1];
		} else {
			throw new Error(`Error parsing: "${s}".`);
		}
	});
}

function basename(url) {
	const parts = url.split("/");
	if (parts.length === 0) {
		throw new Error(`Bad url: "${url}"`);
	}
	return parts[parts.length - 1];
}

function dirname(url) {
	return url.slice(CORE_LIB_PATH.length, url.length - basename(url).length);
}

const libs = {};
const loaded = new Set();

async function addCoreLib(path) {
	console.log("addCoreLib", path);
	return addLib(CORE_LIB_PATH + path);
}

async function addLib(url, path) {
	console.log("addLib", url, path);
	const fileName = basename(url);
	const filePath = path || fileName;

	if (loaded.has(url)) {
		return;
	}
	loaded.add(url);

	UI.toggleSpinner(true);

	let text = "";
	for (let i = 0; i < 3; i++) {
		const res = await fetch(url);
		if (res.status === 404) {
			console.log(`Failed to load "${fileName}" ( Attempt #${i} )`);
		} else {
			text = await res.text();
			break;
		}
	}

	UI.toggleSpinner(false);

	if (path === undefined) {
		// hack?
		const paths = getReferencePaths(text);
		if (paths.length > 0) {
			console.log(`${fileName} depends on ${paths.join(", ")}`);
			for (const path of paths) {
				await addCoreLib(joinPath(dirname(url), path));
			}
		}
	}

	worker.postMessage({
		type: "library",
		path: filePath,
		source: text
	});

	const lib = monaco.languages.typescript.typescriptDefaults.addExtraLib(text, filePath);

	console.log(`Added "${fileName}"`);

	libs[fileName] = lib;

	return lib;
}

async function main() {
	const compilerOptions = {
		noImplicitAny: true,
		strictNullChecks: true,
		strictFunctionTypes: true,
		strictPropertyInitialization: true,
		noImplicitThis: true,
		noImplicitReturns: true,

		alwaysStrict: true,
		allowUnreachableCode: false,
		allowUnusedLabels: false,

		downlevelIteration: true,
		noEmitHelpers: false,
		noLib: true,
		noStrictGenericChecks: false,
		noUnusedLocals: false,
		noUnusedParameters: false,

		esModuleInterop: true,
		preserveConstEnums: false,
		removeComments: false,
		skipLibCheck: false,

		experimentalDecorators: false,
		emitDecoratorMetadata: false,

		target: monaco.languages.typescript.ScriptTarget.ES2016,
		jsx: monaco.languages.typescript.JsxEmit.React,

		typeRoots: ["node_modules/@rbxts"]
	};

	const sharedEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		theme: "vs-dark"
	};

	const State = {
		inputModel: null,
		outputModel: null
	};

	let inputEditor;

	function createFile(compilerOptions) {
		return monaco.Uri.file(
			"input." + (compilerOptions.jsx === monaco.languages.typescript.JsxEmit.None ? "ts" : "tsx")
		);
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

		selectExample: async function(exampleName) {
			try {
				const res = await fetch(`${window.CONFIG.baseUrl}examples/${exampleName}.ts`);
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

		setCodeFromHash: async function() {
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
			UI.selectExample("lava");
		}
	};

	window.MonacoEnvironment = {
		getWorkerUrl: function(workerId, label) {
			return `worker.js?version=${window.CONFIG.monacoVersion}`;
		}
	};

	const res = await fetch(`${CORE_LIB_BASE}/package.json`);
	if (res.status === 200) {
		console.log("@rbxts/types", JSON.parse(await res.text()).version);
	}

	for (const path of window.CONFIG.extraLibs) {
		await addCoreLib(path);
	}

	await addLib("https://unpkg.com/@rbxts/t@latest/lib/t.d.ts", "node_modules/@rbxts/t/index.d.ts");

	monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

	State.inputModel = monaco.editor.createModel(UI.getInitialCode(), "typescript", createFile(compilerOptions));

	State.outputModel = monaco.editor.createModel("", "lua", monaco.Uri.file("output.lua"));

	inputEditor = monaco.editor.create(
		document.getElementById("input"),
		Object.assign({ model: State.inputModel }, sharedEditorOptions)
	);

	monaco.editor.create(
		document.getElementById("output"),
		Object.assign({ model: State.outputModel, readOnly: true }, sharedEditorOptions)
	);

	function updateOutput() {
		const tsSource = State.inputModel.getValue();
		worker.postMessage({
			type: "compile",
			source: tsSource
		});

		if (UI.shouldUpdateHash) {
			UI.updateURL();
		}
	}

	worker.addEventListener("message", e => {
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
		event => {
			const S_KEY = 83;
			if (event.keyCode == S_KEY && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();

				window.clipboard.writeText(location.href.toString()).then(
					() => UI.showFlashMessage("URL is copied to the clipboard!"),
					e => {
						alert(e);
					}
				);
			}
		},
		false
	);

	function prettier() {
		const PRETTIER_VERSION = "1.14.3";

		require([
			`https://unpkg.com/prettier@${PRETTIER_VERSION}/standalone.js`,
			`https://unpkg.com/prettier@${PRETTIER_VERSION}/parser-typescript.js`
		], function(prettier, { parsers }) {
			const cursorOffset = State.inputModel.getOffsetAt(inputEditor.getPosition());

			const formatResult = prettier.formatWithCursor(State.inputModel.getValue(), {
				parser: parsers.typescript.parse,
				printWidth: 120,
				tabWidth: 4,
				useTabs: true,
				trailingComma: "all",
				cursorOffset
			});

			State.inputModel.setValue(formatResult.formatted);
			const newPosition = State.inputModel.getPositionAt(formatResult.cursorOffset);
			inputEditor.setPosition(newPosition);
		});
	}
}
