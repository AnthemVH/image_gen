"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = { children: React.ReactNode };

export function AuthGate({ children }: Props) {
	const router = useRouter();
	const [checked, setChecked] = React.useState(false);

	React.useEffect(() => {
		let mounted = true;
		(async () => {
			const { data } = await supabase.auth.getSession();
			if (!mounted) return;
			if (!data.session) {
				router.replace("/login");
				return;
			}
			setChecked(true);
		})();

		const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session) router.replace("/login");
		});
		return () => {
			mounted = false;
			sub.subscription.unsubscribe();
		};
	}, [router]);

	if (!checked) {
		return (
			<div className="container-centered">
				<div className="w-full max-w-sm card p-6 text-center">
					<div className="h-2 w-full bg-rose-100 rounded-full overflow-hidden">
						<div className="h-full w-1/2 shimmer rounded-full" />
					</div>
					<p className="mt-4 text-rose-600">Checking access…</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}


