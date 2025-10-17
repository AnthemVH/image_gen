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
        <Card className="mt-6 p-4 bg-white/80 backdrop-blur-xl rounded-2xl fade-in">
            <CardHeader>
                <CardTitle className="text-rose-700">Your Design</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full grid gap-4">
                    <div className="w-full rounded-2xl p-3 bg-rose-50/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Generated" className="mx-auto max-h-[512px] rounded-xl shadow-lg" />
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <a href={imageUrl} download>
                            <Button className="rounded-xl btn-primary">Download 💾</Button>
                        </a>
                        <button type="submit" formAction={() => {}} className="btn rounded-xl bg-white/70 hover:bg-white glow px-4 py-2 border border-rose-200 text-rose-700">
                            Regenerate 🔁
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


