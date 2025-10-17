import * as React from "react";
import { cn } from "../utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, children, ...props }, ref) => (
		<select
			ref={ref}
			className={cn(
				"flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className
			)}
			{...props}
		>
			{children}
		</select>
	)
);
Select.displayName = "Select";


