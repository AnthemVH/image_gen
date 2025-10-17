import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Nano Banana Image Generator",
	description: "Generate AI images with Nano Banana and log prompts to Supabase",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}


