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
        const modelId = (payload.model && typeof payload.model === "string" && payload.model.trim()) || "gemini-2.5-flash-image";
        // Gemini Images API endpoint (generateContent)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(process.env.GOOGLE_API_KEY!)}`;
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
                    // Map width/height to aspect ratio (fallback to 1:1)
                    let aspectRatio: string | undefined;
                    if (payload.width && payload.height) {
                        if (payload.width === payload.height) aspectRatio = "1:1";
                        else if (payload.width > payload.height) aspectRatio = "16:9";
                        else aspectRatio = "9:16";
                    }

                    const parts: any[] = [{ text: payload.prompt }];
                    // Negative prompt is not officially supported; omit or include as plain text hint
                    if (payload.negative_prompt) {
                        parts.push({ text: `Avoid: ${String(payload.negative_prompt)}` });
                    }

                    const body: Record<string, unknown> = {
                        contents: [
                            {
                                parts,
                            },
                        ],
                        generationConfig: {
                            responseModalities: ["IMAGE"],
                            ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
                        },
                    };

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
        // Parse candidates->content->parts for inlineData/inline_data
        const candidates = data?.candidates;
        if (Array.isArray(candidates) && candidates.length > 0) {
            const parts = candidates[0]?.content?.parts || [];
            for (const p of parts) {
                const inlineCamel = p?.inlineData?.data;
                const inlineSnake = p?.inline_data?.data;
                const base64 = inlineCamel || inlineSnake;
                if (typeof base64 === "string" && base64.length > 0) {
                    imageUrl = `data:image/png;base64,${base64}`;
                    break;
                }
            }
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


