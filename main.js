// whoa, no typescript and no compilation!

const LibManager = {
	libs: {},
	loaded: new Set(),

	coreLibPath: `https://unpkg.com/@rbxts/types@1.0.210/include/`,

	joinPath(...parts) {
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
	},

	getReferencePaths(input) {
		const rx = /<reference path="([^"]+)"\s\/>/;
		return (input.match(new RegExp(rx.source, "g")) || []).map(s => {
			const match = s.match(rx);
			if (match && match.length >= 2) {
				return match[1];
			} else {
				throw new Error(`Error parsing: "${s}".`);
			}
		});
	},

	basename(url) {
		const parts = url.split("/");
		if (parts.length === 0) {
			throw new Error(`Bad url: "${url}"`);
		}
		return parts[parts.length - 1];
	},

	dirname(url) {
		return url.slice(this.coreLibPath.length, url.length - this.basename(url).length);
	},

	addLib: async function(path) {
		const url = this.coreLibPath + path;
		const fileName = this.basename(url);

		if (this.loaded.has(path)) {
			return;
		}
		this.loaded.add(path);

		UI.toggleSpinner(true);

		let text = "";
		for (let i = 0; i < 3; i++) {
			const res = await fetch(url);
			if (res.status === 404) {
				console.log(`Failed to load "${path}" ( Attempt #${i} )`);
			} else {
				text = await res.text();
				break;
			}
		}

		UI.toggleSpinner(false);

		const paths = this.getReferencePaths(text);
		if (paths.length > 0) {
			console.log(`${fileName} depends on ${paths.join(", ")}`);
			for (const path of paths) {
				await this.addLib(this.joinPath(this.dirname(url), path));
			}
		}

		registerLib(fileName, text);
		const lib = monaco.languages.typescript.typescriptDefaults.addExtraLib(text, fileName);

		console.log(`Added "${fileName}"`);

		this.libs[fileName] = lib;

		return lib;
	}
};

async function main() {
	const defaultCompilerOptions = {
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
		jsx: monaco.languages.typescript.JsxEmit.React
	};

	const urlDefaults = Object.entries(defaultCompilerOptions).reduce((acc, [key, value]) => {
		if (params.has(key)) {
			const urlValue = params.get(key);

			if (urlValue === "true") {
				acc[key] = true;
			} else if (urlValue === "false") {
				acc[key] = false;
			} else if (!isNaN(parseInt(urlValue, 10))) {
				acc[key] = parseInt(params.get(key), 10);
			}
		}

		return acc;
	}, {});

	const compilerOptions = Object.assign({}, defaultCompilerOptions, urlDefaults);

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

	let inputEditor, outputEditor;

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

		console() {
			if (!window.ts) {
				return;
			}

			console.log(`Using TypeScript ${window.ts.version}`);

			console.log("Available globals:");
			console.log("\twindow.ts", window.ts);
			console.log("\twindow.client", window.client);
		},

		selectVersion(version) {
			if (version === window.CONFIG.getLatestVersion()) {
				location.href = `${window.CONFIG.baseUrl}${location.hash}`;
				return false;
			}

			location.href = `${window.CONFIG.baseUrl}?ts=${version}${location.hash}`;
			return false;
		},

		selectExample: async function(exampleName) {
			try {
				const res = await fetch(`${window.CONFIG.baseUrl}examples/${exampleName}.ts`);
				const code = await res.text();
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
			const diff = Object.entries(defaultCompilerOptions).reduce((acc, [key, value]) => {
				if (value !== compilerOptions[key]) {
					acc[key] = compilerOptions[key];
				}

				return acc;
			}, {});

			const hash = `code/${LZString.compressToEncodedURIComponent(State.inputModel.getValue())}`;

			const urlParams = Object.assign({}, diff);

			["lib", "ts"].forEach(param => {
				if (params.has(param)) {
					urlParams[param] = params.get(param);
				}
			});

			if (Object.keys(urlParams).length > 0) {
				const queryString = Object.entries(urlParams)
					.map(([key, value]) => {
						return `${key}=${encodeURIComponent(value)}`;
					})
					.join("&");

				window.history.replaceState({}, "", `${window.CONFIG.baseUrl}?${queryString}#${hash}`);
			} else {
				window.history.replaceState({}, "", `${window.CONFIG.baseUrl}#${hash}`);
			}
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
			return `worker.js?version=${window.CONFIG.getMonacoVersion()}`;
		}
	};

	for (const path of window.CONFIG.extraLibs) {
		await LibManager.addLib(path);
	}

	monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

	State.inputModel = monaco.editor.createModel(UI.getInitialCode(), "typescript", createFile(compilerOptions));

	State.outputModel = monaco.editor.createModel("", "lua", monaco.Uri.file("output.lua"));

	inputEditor = monaco.editor.create(
		document.getElementById("input"),
		Object.assign({ model: State.inputModel }, sharedEditorOptions)
	);

	outputEditor = monaco.editor.create(
		document.getElementById("output"),
		Object.assign({ model: State.outputModel }, sharedEditorOptions)
	);

	function updateOutput() {
		try {
			const tsSource = State.inputModel.getValue();
			let luaSource;
			try {
				luaSource = compileSource("export {};\n" + tsSource);
			} catch (e) {
				luaSource = `--[[\n${e.toString().replace(/(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]/g, "")}\n]]`;
			}
			State.outputModel.setValue(luaSource);
		} catch (e) {
			console.log("e", e);
		}

		if (UI.shouldUpdateHash) {
			UI.updateURL();
		}
	}

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