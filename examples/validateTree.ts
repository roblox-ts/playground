import { validateTree, EvaluateInstanceTree, yieldForTree } from "@rbxts/validate-tree";

enum ItemType {
	A,
	B,
	C,
	D
}

// define a Rojo-esque object tree , which can be validated at run-time
const ItemScreen = {
	$className: "ScreenGui",
	Configuration: {
		$className: "Configuration",
		NumItems: "IntValue",
		ItemType: { $className: "IntValue" }
	}
} as const; // preserves the literal type of each member

type ItemScreen = EvaluateInstanceTree<typeof ItemScreen>;

function printItemTypeName(itemScreen: ItemScreen) {
	print(ItemType[itemScreen.Configuration.ItemType.Value]);
}

const { Parent: parent } = script;

// if parent is defined and it matches the ItemScreen tree:
if (parent && validateTree(parent, ItemScreen)) {
	// parent is the type `ItemScreen`
	print(parent.Configuration.NumItems.Value);
	printItemTypeName(parent);
}

if (parent) {
	// returns a promise which yields until `parent` matches `ItemScreen`
	yieldForTree(parent, ItemScreen).then(itemScreen => {
		++itemScreen.Configuration.NumItems.Value;
	});

	// per usual, promises can yield the current thread via the `await` operator in async contexts
	async () => {
		const itemScreen = await yieldForTree(parent, ItemScreen);
		++itemScreen.Configuration.NumItems.Value;
	};
}
