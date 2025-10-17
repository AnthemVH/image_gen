"use client";

import * as React from "react";
import { ImageForm } from "@/components/ImageForm";
import { ImageResult } from "@/components/ImageResult";
import { Card } from "@/components/ui/card";

export default function Page() {
	const [imageUrl, setImageUrl] = React.useState<string | null>(null);

	return (
		<div className="container-centered">
			<div className="w-full max-w-2xl">
				<div className="text-center mb-6">
					<h1 className="text-2xl md:text-3xl font-semibold">Nano Banana Image Generator 🍌</h1>
					<p className="text-sm text-gray-500 mt-1">Generate images via Nano Banana and log prompts to Supabase.</p>
				</div>
				<Card className="p-4">
					<ImageForm onResult={setImageUrl} />
				</Card>
				<ImageResult imageUrl={imageUrl} />
			</div>
		</div>
	);
}


