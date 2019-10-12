import { CollectionService } from "@rbxts/services";

for (const obj of CollectionService.GetTagged("Lava")) {
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
}
