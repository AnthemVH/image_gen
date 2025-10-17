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
    const [concept, setConcept] = React.useState("");
    const [style, setStyle] = React.useState("");
    const [mood, setMood] = React.useState("");
    const [preview, setPreview] = React.useState("");
    const [progress, setProgress] = React.useState(0);
    const stages = React.useMemo(() => [
        "Preparing your prompt",
        "Talking to Gemini",
        "Generating image",
        "Finalizing",
    ], []);
    const [stageIndex, setStageIndex] = React.useState(0);
    const [nailMode, setNailMode] = React.useState(true);

    const basePrompt = `A high-quality close-up photo of professionally done acrylic nails on elegant hands, perfect lighting, beauty-studio background.
Ultra-realistic macro detail of nail art — focus on polish texture, reflections, and design clarity.
Emphasize hand and nail composition, not full body.
Showcase shape, color, finish, and design beautifully.`;

    const displayedPreview = nailMode ? `${basePrompt} ${preview}`.trim() : preview;

    function handlePreviewChange(val: string) {
        if (nailMode) {
            const trimmed = val.trimStart();
            if (trimmed.startsWith(basePrompt)) {
                const rest = trimmed.slice(basePrompt.length).trimStart();
                setPreview(rest);
                return;
            }
        }
        setPreview(val);
    }

    React.useEffect(() => {
        const parts = [concept, style && `in a ${style} style`, mood && `with a ${mood} mood`].filter(Boolean);
        setPreview(parts.join(", "));
    }, [concept, style, mood]);

	async function onSubmit(formData: FormData) {
        setLoading(true);
        setError(null);
        setProgress(5);
        setStageIndex(0);
        let i = 0;
        const tick = setInterval(() => {
            i += 1;
            setProgress((p) => Math.min(95, p + 5));
            setStageIndex((s) => Math.min(stages.length - 1, s + (i % 2 === 0 ? 1 : 0)));
        }, 800);

        const userFinalPrompt = String(formData.get("prompt") || preview || "");
        const combinedPrompt = nailMode ? `${basePrompt} ${userFinalPrompt}` : userFinalPrompt;

        const modelField = String(formData.get("model") || "");
        const stepsField = formData.get("steps");
        const cfgField = formData.get("cfg_scale");
        const widthField = formData.get("width");
        const heightField = formData.get("height");
        const samplerField = String(formData.get("sampler") || "");

        const payload = {
            prompt: combinedPrompt,
            negative_prompt: String(formData.get("negative_prompt") || ""),
            model: nailMode ? "gemini-2.5-flash-image" : (modelField || "gemini-2.5-flash-image"),
            steps: nailMode ? 30 : Number(stepsField || 28),
            cfg_scale: nailMode ? 7 : Number(cfgField || 7),
            width: nailMode ? 768 : Number(widthField || 512),
            height: nailMode ? 768 : Number(heightField || 512),
            seed: formData.get("seed") ? Number(formData.get("seed")) : undefined,
            sampler: nailMode ? "dpmpp_2m" : (samplerField || "euler_a"),
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
            setProgress(100);
            setStageIndex(stages.length - 1);
			onResult(data.imageUrl);
		} catch (e) {
			console.error(e);
			setError((e as Error).message);
		} finally {
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
                setStageIndex(0);
            }, 500);
            // clear the interval timer
            // eslint-disable-next-line no-undef
            clearInterval(tick as unknown as number);
		}
	}

    return (
        <form className="space-y-5 fade-in" action={onSubmit}>
            <div className="card p-5">
                <div className="mb-3">
                    <h2 className="text-xl font-semibold text-rose-700">Creative Studio</h2>
                    <p className="text-sm text-rose-400">Describe your vision below. Keep it dreamy and detailed.</p>
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="concept" className="text-rose-700">Concept</Label>
                    <Textarea id="concept" className="textarea" placeholder="e.g., Soft pastel nail set with tiny stars and glossy finish" value={concept} onChange={(e) => setConcept(e.target.value)} disabled={loading} />
                </div>
                <div className="grid gap-3 mt-4">
                    <Label htmlFor="style" className="text-rose-700">Style</Label>
                    <Textarea id="style" className="textarea" placeholder="e.g., kawaii, minimal, glossy, marble" value={style} onChange={(e) => setStyle(e.target.value)} disabled={loading} />
                </div>
                <div className="grid gap-3 mt-4">
                    <Label htmlFor="mood" className="text-rose-700">Mood</Label>
                    <Textarea id="mood" className="textarea" placeholder="e.g., romantic, playful, dreamy" value={mood} onChange={(e) => setMood(e.target.value)} disabled={loading} />
                </div>
            </div>

            <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-rose-700">Final Prompt Preview</h3>
                    <span className="text-xs text-rose-400">Editable</span>
                </div>
                <Textarea id="prompt" name="prompt" className="textarea" value={displayedPreview} onChange={(e) => handlePreviewChange(e.target.value)} placeholder="Your combined prompt will appear here" disabled={loading} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="negative_prompt" className="text-rose-700">Avoid</Label>
                        <Input id="negative_prompt" name="negative_prompt" className="input" placeholder="blurry, low quality" disabled={loading} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="model" className="text-rose-700">Model</Label>
                        <Select id="model" name="model" defaultValue="gemini-2.5-flash-image" disabled={loading}>
                            <option value="gemini-2.5-flash-image">gemini-2.5-flash-image</option>
                            <option value="imagen-4">imagen-4</option>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <Input id="width" name="width" type="number" min={64} max={1536} step={64} defaultValue={512} className="input" placeholder="Width" disabled={loading} />
                    <Input id="height" name="height" type="number" min={64} max={1536} step={64} defaultValue={512} className="input" placeholder="Height" disabled={loading} />
                    <Input id="steps" name="steps" type="number" min={1} max={100} defaultValue={28} className="input" placeholder="Steps" disabled={loading} />
                    <Input id="cfg_scale" name="cfg_scale" type="number" min={1} max={30} defaultValue={7} className="input" placeholder="CFG" disabled={loading} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <Input id="seed" name="seed" type="number" className="input" placeholder="Seed (optional)" disabled={loading} />
                    <Input id="sampler" name="sampler" className="input" defaultValue="euler_a" placeholder="Sampler" disabled={loading} />
                </div>

                {loading ? (
                    <div className="mt-6" aria-live="polite" aria-busy={loading}>
                        <div className="h-2 w-full bg-rose-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-rose-600 text-sm">
                            <span className="inline-block h-3 w-3 rounded-full border-2 border-rose-400 border-t-transparent animate-spin"></span>
                            <span>{stages[stageIndex]}</span>
                        </div>
                    </div>
                ) : null}
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="sr-only"
                        checked={nailMode}
                        onChange={(e) => setNailMode(e.target.checked)}
                        aria-label="Nail Design Mode"
                    />
                    <span
                        className={`relative h-6 w-11 rounded-full transition-colors ${nailMode ? "bg-rose-500" : "bg-rose-200"}`}
                        onClick={() => setNailMode(!nailMode)}
                        role="switch"
                        aria-checked={nailMode}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${nailMode ? "translate-x-5" : "translate-x-0"}`}
                        />
                    </span>
                    <span className="text-rose-700 text-sm">✨ Nail Design Mode (recommended)</span>
                </label>
                {nailMode ? <span className="text-xs text-rose-500">Base prompt applied</span> : null}
            </div>

            <Button type="submit" className="w-full btn-primary rounded-xl glow mt-2" disabled={loading}>
                {loading ? "Generating…" : "✨ Generate Design"}
            </Button>
        </form>
    );
}


