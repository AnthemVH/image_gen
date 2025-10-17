import * as React from "react";
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type = "text", ...props }, ref) => {
		return (
			<input
				className={cn(
					"flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					className
				)}
				type={type}
				ref={ref}
				{...props}
			/>
		);
	}
);
Input.displayName = "Input";


