import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type GenerateBody = {
    prompt: string;
    negative_prompt?: string;
    model?: string; // Gemini Images model id, e.g., imagegeneration
    steps?: number; // mapped to sampler config if supported
    cfg_scale?: number; // guidanceScale
    width?: number;
    height?: number;
    seed?: number;
    sampler?: string;
};

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as GenerateBody;
		if (!body?.prompt || typeof body.prompt !== "string") {
			return NextResponse.json({ error: "prompt is required" }, { status: 400 });
		}

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "GOOGLE_API_KEY is not configured" }, { status: 500 });
        }

		// Coerce numeric fields safely
		const payload: GenerateBody = {
			prompt: body.prompt,
			negative_prompt: body.negative_prompt ?? "",
			model: body.model ?? "banana-v3",
			steps: body.steps ? Number(body.steps) : 28,
			cfg_scale: body.cfg_scale ? Number(body.cfg_scale) : 7,
			width: body.width ? Number(body.width) : 512,
			height: body.height ? Number(body.height) : 512,
			seed: body.seed ? Number(body.seed) : undefined,
			sampler: body.sampler ?? "euler_a",
		};

		// 1) Log to Supabase (best-effort)
		try {
			await supabase.from("nano_logs").insert([
				{
					prompt: payload.prompt,
					negative_prompt: payload.negative_prompt,
					model: payload.model,
					steps: payload.steps,
					cfg_scale: payload.cfg_scale,
					width: payload.width,
					height: payload.height,
					seed: payload.seed,
					sampler: payload.sampler,
				},
			]);
		} catch (e) {
			// ignore logging errors
		}

        // 2) Call Google Gemini Images API with retries and a longer timeout
        // Default model: imagegeneration (Gemini Images API)
        const modelId = (payload.model && typeof payload.model === "string" && payload.model.trim()) || "imagegeneration";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generate?key=${encodeURIComponent(process.env.GOOGLE_API_KEY!)}`;
		async function fetchWithTimeout(url: string, options: RequestInit & { timeoutMs: number }) {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), options.timeoutMs);
			try {
				return await fetch(url, { ...options, signal: controller.signal });
			} finally {
				clearTimeout(timer);
			}
		}

        async function fetchWithRetry(attempts: number): Promise<Response> {
			let lastErr: unknown;
			for (let i = 0; i < attempts; i++) {
				try {
                    // Map our payload to Gemini Images API schema
                    const body = {
                        prompt: { text: payload.prompt },
                        ...(payload.negative_prompt ? { negativePrompt: { text: String(payload.negative_prompt) } } : {}),
                        imageGenerationConfig: {
                            numberOfImages: 1,
                            width: payload.width ?? 512,
                            height: payload.height ?? 512,
                            ...(payload.seed !== undefined ? { seed: String(payload.seed) } : {}),
                            ...(payload.cfg_scale !== undefined ? { guidanceScale: Number(payload.cfg_scale) } : {}),
                            // sampler/steps may or may not be supported; include if provided
                            ...(payload.sampler ? { sampler: String(payload.sampler) } : {}),
                            ...(payload.steps ? { steps: Number(payload.steps) } : {}),
                        },
                    } as Record<string, unknown>;

                    return await fetchWithTimeout(apiUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body),
                        timeoutMs: 60000,
                    });
				} catch (e) {
					lastErr = e;
					// Exponential backoff: 500ms, 1500ms
					if (i < attempts - 1) {
						await new Promise((r) => setTimeout(r, 500 * Math.pow(3, i)));
					}
				}
			}
			throw lastErr instanceof Error ? lastErr : new Error("Upstream request failed");
		}

		let upstream: Response;
		try {
			upstream = await fetchWithRetry(2);
        } catch (networkErr) {
			return NextResponse.json(
				{
                    error: "Network error contacting Google Gemini Images API",
					detail: (networkErr as Error).message,
					url: apiUrl,
				},
				{ status: 504 }
			);
		}

        if (!upstream.ok) {
			let detail: unknown;
			try {
				detail = await upstream.clone().json();
			} catch {
				detail = await upstream.text();
			}
			return NextResponse.json(
                { error: "Gemini Images API request failed", status: upstream.status, detail },
				{ status: upstream.status }
			);
		}

        const data = await upstream.json();
        let imageUrl: string | undefined;
        // Google Images API typical response
        // {
        //   images: [{ image: { bytesBase64Encoded: "..." } }]
        // }
        const base64 = data?.images?.[0]?.image?.bytesBase64Encoded || data?.images?.[0]?.bytesBase64Encoded;
        if (typeof base64 === "string" && base64.length > 0) {
            imageUrl = `data:image/png;base64,${base64}`;
        }

		if (!imageUrl) {
			return NextResponse.json({ error: "No image in response" }, { status: 502 });
		}

		return NextResponse.json({ imageUrl });
	} catch (err: unknown) {
		return NextResponse.json(
			{ error: (err as Error)?.message ?? "Unknown error" },
			{ status: 500 }
		);
	}
}


