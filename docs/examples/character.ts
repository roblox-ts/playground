import { Players } from "@rbxts/services";
import yieldForR15CharacterDescendants from "@rbxts/yield-for-character";

Players.PlayerAdded.Connect((player) => {
	player.CharacterAdded.Connect(async (characterModel) => {
		const character = await yieldForR15CharacterDescendants(characterModel);
		character.Head.face.Destroy();
	});
});
