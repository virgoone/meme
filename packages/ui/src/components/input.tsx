import { cn } from "@bunship-ai/ui/lib/utils";
import type * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex h-[var(--ui-field-min-height)] min-h-[var(--ui-field-min-height)] w-full min-w-0 [border-color:var(--ui-field-border-color)] [background:var(--ui-field-bg)] px-[var(--ui-field-padding-x)] py-[var(--ui-field-padding-y)] [color:var(--ui-field-foreground)] outline-none transition-all duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] [border-radius:var(--ui-field-radius)] [border-width:var(--ui-field-border-width)] [box-shadow:var(--ui-field-shadow)] [font-family:var(--ui-field-font-family)] [font-size:var(--ui-field-font-size)] [font-weight:var(--ui-field-font-weight)] [line-height:var(--ui-field-line-height)] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:[color:var(--ui-field-placeholder)] read-only:cursor-default read-only:border-border/75 read-only:bg-muted/65 read-only:text-muted-foreground read-only:placeholder:text-muted-foreground/80 read-only:[box-shadow:none] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border/75 disabled:bg-muted/65 disabled:text-muted-foreground disabled:placeholder:text-muted-foreground/80 disabled:[box-shadow:none] disabled:opacity-100",
				"focus-visible:border-ring focus-visible:ring-[var(--ui-control-ring-width)] focus-visible:ring-ring/35",
				"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
				type === "number" &&
					"[appearance:textfield] tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
