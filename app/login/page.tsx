"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const { error: err } = await supabase.auth.signInWithPassword({ email, password });
			if (err) throw err;
			window.location.href = "/";
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="container-centered">
			<div className="w-full max-w-sm card p-6">
				<h1 className="text-2xl font-semibold text-rose-700 text-center">Sign in</h1>
				<p className="text-sm text-rose-500 text-center mb-4">Access the Design Studio</p>
				<form className="space-y-3" onSubmit={onSubmit}>
					<Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
					<Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
					{error ? <p className="text-sm text-rose-600">{error}</p> : null}
					<Button type="submit" className="w-full btn-primary rounded-xl" disabled={loading}>
						{loading ? "Signing in…" : "Sign in"}
					</Button>
				</form>
				<p className="text-xs text-rose-400 mt-3 text-center">Accounts are created in Supabase only.</p>
			</div>
		</div>
	);
}


