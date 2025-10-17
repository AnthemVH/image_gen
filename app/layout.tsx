import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Design Studio",
	description: "Create beautiful AI designs with a polished, feminine interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}


