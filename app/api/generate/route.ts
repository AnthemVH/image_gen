import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type GenerateBody = {
	prompt: string;
	negative_prompt?: string;
	model?: string;
	steps?: number;
	cfg_scale?: number;
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

		if (!process.env.NANO_BANANA_API_KEY) {
			return NextResponse.json({ error: "NANO_BANANA_API_KEY is not configured" }, { status: 500 });
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

		// 2) Call Nano Banana API with retries and a longer timeout
		const apiUrl = process.env.NANO_BANANA_API_URL ?? "https://api.nanobanana.ai/v1/images";
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
					return await fetchWithTimeout(apiUrl, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${process.env.NANO_BANANA_API_KEY}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(payload),
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
					error: "Network error contacting Nano Banana API",
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
				{ error: "Nano Banana API request failed", status: upstream.status, detail },
				{ status: upstream.status }
			);
		}

		const data = await upstream.json();
		let imageUrl: string | undefined;
		if (data?.image_base64) {
			imageUrl = `data:image/png;base64,${data.image_base64}`;
		} else if (data?.image_url) {
			imageUrl = data.image_url;
		} else if (Array.isArray(data?.data) && data.data[0]?.url) {
			imageUrl = data.data[0].url;
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


