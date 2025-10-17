"use client";

import * as React from "react";
import { ImageForm } from "@/components/ImageForm";
import { ImageResult } from "@/components/ImageResult";
import { Card } from "@/components/ui/card";
import { AuthGate } from "@/components/AuthGate";
import { History, type HistoryItem } from "@/components/History";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);
    const [history, setHistory] = React.useState<HistoryItem[]>([]);
    const capacityMax = React.useMemo(() => {
        const envCap = Number(process.env.NEXT_PUBLIC_HISTORY_CAP || "");
        if (Number.isFinite(envCap) && envCap > 0) return envCap;
        return 1200;
    }, []);
    const [userId, setUserId] = React.useState<string | null>(null);

    React.useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getUser();
            setUserId(data.user?.id ?? null);
            if (data.user?.id) await refreshHistory(data.user.id);
        })();
    }, []);

    async function refreshHistory(uid: string) {
        try {
            const folder = `${uid}`;
            const { data, error } = await supabase.storage.from("designs").list(folder, { limit: 1000 });
            if (error) return;
            const webps = (data || []).filter((f) => f.name.endsWith(".webp"));
            // Sort newest first by name (timestamp.webp)
            webps.sort((a, b) => (a.name < b.name ? 1 : -1));
            const items: HistoryItem[] = await Promise.all(
                webps.map(async (f) => {
                    const path = `${folder}/${f.name}`;
                    const { data: urlData } = supabase.storage.from("designs").getPublicUrl(path);
                    let payload: any = {};
                    const metaPath = `${path}.json`;
                    const { data: metaData } = await supabase.storage.from("designs").download(metaPath).catch(() => ({ data: null } as any));
                    if (metaData) {
                        try {
                            const txt = await metaData.text();
                            payload = JSON.parse(txt);
                        } catch {}
                    }
                    return { imageUrl: urlData.publicUrl, createdAt: Number(f.name.replace(/\.webp$/, "")) || Date.now(), payload };
                })
            );
            setHistory(items);
        } catch {}
    }

    const handleResult = React.useCallback(async (url: string) => {
        setImageUrl(url);
        // Upload to Supabase Storage as webp with metadata, then refresh
        try {
            if (!userId) return;
            const payloadRaw = sessionStorage.getItem("nb_last_payload");
            const payload = payloadRaw ? JSON.parse(payloadRaw) : {};
            // Convert data URL -> webp blob in browser
            const blob = await dataUrlToWebpBlob(url);
            const ts = Date.now();
            const path = `${userId}/${ts}.webp`;
            await supabase.storage.from("designs").upload(path, blob, { contentType: "image/webp", upsert: false });
            // Upload metadata JSON
            const metaBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
            await supabase.storage.from("designs").upload(`${path}.json`, metaBlob, { contentType: "application/json", upsert: true });
            // Enforce capacity (client-side best-effort)
            const { data } = await supabase.storage.from("designs").list(`${userId}`, { limit: 2000 });
            const webps = (data || []).filter((f) => f.name.endsWith(".webp"));
            if (webps.length > capacityMax) {
                webps.sort((a, b) => (a.name < b.name ? -1 : 1)); // oldest first
                const toDelete = webps.slice(0, webps.length - capacityMax).map((f) => `${userId}/${f.name}`);
                if (toDelete.length) await supabase.storage.from("designs").remove(toDelete);
            }
            await refreshHistory(userId);
        } catch {
            // ignore errors; history still shows current session
        }
    }, [capacityMax, userId]);

    async function dataUrlToWebpBlob(dataUrl: string): Promise<Blob> {
        // Draw PNG dataURL into canvas and export as webp
        const img = new Image();
        img.decoding = "async" as any;
        const blob = await new Promise<Blob>((resolve, reject) => {
            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject(new Error("No 2d context"));
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", 0.92);
                } catch (e) {
                    reject(e as Error);
                }
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = dataUrl;
        });
        return blob;
    }

    React.useEffect(() => {
        try {
            const raw = sessionStorage.getItem("nb_history");
            if (raw) setHistory(JSON.parse(raw));
        } catch {}
    }, []);

    return (
        <AuthGate>
            <div className="container-centered">
                <div className="w-full max-w-3xl">
                    <div className="text-center mb-6 fade-in">
                        <h1 className="text-3xl md:text-4xl font-semibold text-rose-700">Design Studio</h1>
                    </div>
                    <Card className="p-4">
                        <ImageForm onResult={handleResult} />
                    </Card>
                    <ImageResult imageUrl={imageUrl} />
                    <History items={history} capacityMax={capacityMax} />
                </div>
            </div>
        </AuthGate>
    );
}


