"use client";

import * as React from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { Button } from "./ui/button";

type Props = {
	onResult: (url: string) => void;
};

export function ImageForm({ onResult }: Props) {
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	async function onSubmit(formData: FormData) {
		setLoading(true);

		const payload = {
			prompt: String(formData.get("prompt") || ""),
			negative_prompt: String(formData.get("negative_prompt") || ""),
			model: String(formData.get("model") || "banana-v3"),
			steps: Number(formData.get("steps") || 28),
			cfg_scale: Number(formData.get("cfg_scale") || 7),
			width: Number(formData.get("width") || 512),
			height: Number(formData.get("height") || 512),
			seed: formData.get("seed") ? Number(formData.get("seed")) : undefined,
			sampler: String(formData.get("sampler") || "euler_a"),
		};

		try {
			const res = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok) {
				const message = data?.error || data?.detail || `Generation failed (${res.status})`;
				throw new Error(typeof message === "string" ? message : JSON.stringify(message));
			}
			onResult(data.imageUrl);
		} catch (e) {
			console.error(e);
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<form
			className="space-y-4"
			action={onSubmit}
		>
			<div className="grid gap-2">
				<Label htmlFor="prompt">Prompt</Label>
				<Textarea id="prompt" name="prompt" required placeholder="A futuristic banana spaceship..." />
			</div>
			<div className="grid gap-2">
				<Label htmlFor="negative_prompt">Negative prompt</Label>
				<Input id="negative_prompt" name="negative_prompt" placeholder="blurry, low quality" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="grid gap-2">
					<Label htmlFor="model">Model</Label>
					<Select id="model" name="model" defaultValue="banana-v3">
						<option value="banana-v3">banana-v3</option>
						<option value="banana-v2">banana-v2</option>
					</Select>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="sampler">Sampler</Label>
					<Input id="sampler" name="sampler" defaultValue="euler_a" />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="steps">Steps</Label>
					<Input id="steps" name="steps" type="number" min={1} max={100} defaultValue={28} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="cfg_scale">CFG Scale</Label>
					<Input id="cfg_scale" name="cfg_scale" type="number" min={1} max={30} defaultValue={7} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="width">Width</Label>
					<Input id="width" name="width" type="number" min={64} max={1536} step={64} defaultValue={512} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="height">Height</Label>
					<Input id="height" name="height" type="number" min={64} max={1536} step={64} defaultValue={512} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="seed">Seed</Label>
					<Input id="seed" name="seed" type="number" placeholder="optional" />
				</div>
			</div>
			{error ? (
				<p className="text-sm text-red-600">{error}</p>
			) : null}
			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? "Generating…" : "Generate"}
			</Button>
		</form>
	);
}


