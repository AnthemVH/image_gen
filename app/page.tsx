"use client";

import * as React from "react";
import { ImageForm } from "@/components/ImageForm";
import { ImageResult } from "@/components/ImageResult";
import { Card } from "@/components/ui/card";

export default function Page() {
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);

    return (
        <div className="container-centered">
            <div className="w-full max-w-3xl">
                <div className="text-center mb-6 fade-in">
                    <h1 className="text-3xl md:text-4xl font-semibold text-rose-700">Design Studio</h1>
                </div>
                <Card className="p-4">
                    <ImageForm onResult={setImageUrl} />
                </Card>
                <ImageResult imageUrl={imageUrl} />
            </div>
        </div>
    );
}


