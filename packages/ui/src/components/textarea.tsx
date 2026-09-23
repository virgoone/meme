import { cn } from "@bunship-ai/ui/lib/utils";
import type * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"field-sizing-content flex min-h-16 w-full [border-color:var(--ui-field-border-color)] [background:var(--ui-field-bg)] px-[var(--ui-field-padding-x)] py-[var(--ui-field-padding-y)] [color:var(--ui-field-foreground)] outline-none transition-all duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] [border-radius:var(--ui-field-radius)] [border-width:var(--ui-field-border-width)] [box-shadow:var(--ui-field-shadow)] [font-family:var(--ui-field-font-family)] [font-size:var(--ui-field-font-size)] [font-weight:var(--ui-field-font-weight)] [line-height:var(--ui-field-line-height)] placeholder:[color:var(--ui-field-placeholder)] focus-visible:border-ring focus-visible:ring-[var(--ui-control-ring-width)] focus-visible:ring-ring/35 read-only:cursor-default read-only:border-border/75 read-only:bg-muted/65 read-only:text-muted-foreground read-only:placeholder:text-muted-foreground/80 read-only:[box-shadow:none] disabled:cursor-not-allowed disabled:border-border/75 disabled:bg-muted/65 disabled:text-muted-foreground disabled:placeholder:text-muted-foreground/80 disabled:[box-shadow:none] disabled:opacity-100 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
