"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

type Props = {
	imageUrl?: string | null;
};

export function ImageResult({ imageUrl }: Props) {
	if (!imageUrl) return null;
	return (
		<Card className="mt-6">
			<CardHeader>
				<CardTitle>Result</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="w-full grid gap-3">
					<div className="w-full">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={imageUrl} alt="Generated" className="mx-auto max-h-[512px] rounded-md shadow" />
					</div>
					<div className="flex justify-center">
						<a href={imageUrl} download>
							<Button>Download</Button>
						</a>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}


