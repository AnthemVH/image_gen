"use client";

import * as React from "react";

export type HistoryItem = {
	imageUrl: string;
	createdAt: number;
	payload: {
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
};

type Props = {
    items: HistoryItem[];
    capacityMax?: number; // optional max capacity for indicator (used/total)
};

export function History({ items, capacityMax = 1200 }: Props) {
	if (!items?.length) return null;
	return (
		<div className="mt-8 card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-rose-700">History</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700">
                    {Math.min(items.length, capacityMax)}/{capacityMax}
                </span>
            </div>
			<div className="grid gap-4">
				{items.map((it) => (
					<div key={it.createdAt} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={it.imageUrl} alt="prev" className="w-full max-h-40 object-cover rounded-xl border border-rose-100" />
						<div className="md:col-span-2 text-sm text-rose-800">
							<p className="font-medium">Prompt</p>
							<p className="line-clamp-3 text-rose-600">{it.payload.prompt}</p>
							<div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-rose-500">
								<span>Model: <span className="text-rose-700">{it.payload.model || ""}</span></span>
								<span>Steps: <span className="text-rose-700">{it.payload.steps ?? ""}</span></span>
								<span>CFG: <span className="text-rose-700">{it.payload.cfg_scale ?? ""}</span></span>
								<span>Size: <span className="text-rose-700">{it.payload.width}×{it.payload.height}</span></span>
							</div>
							{it.payload.negative_prompt ? (
								<p className="mt-1 text-rose-500">Avoid: <span className="text-rose-700">{it.payload.negative_prompt}</span></p>
							) : null}
							{it.payload.seed !== undefined ? (
								<p className="text-rose-500">Seed: <span className="text-rose-700">{it.payload.seed}</span></p>
							) : null}
							{it.payload.sampler ? (
								<p className="text-rose-500">Sampler: <span className="text-rose-700">{it.payload.sampler}</span></p>
							) : null}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}


