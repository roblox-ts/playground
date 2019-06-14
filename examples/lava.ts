export {};

const CollectionService = game.GetService("CollectionService");

CollectionService.GetTagged("Lava").forEach(obj => {
	if (obj.IsA("BasePart")) {
		obj.Touched.Connect(part => {
			const character = part.Parent;
			if (character) {
				const humanoid = character.FindFirstChild("Humanoid");
				if (humanoid && humanoid.IsA("Humanoid")) {
					humanoid.TakeDamage(100);
				}
			}
		});
	}
});
