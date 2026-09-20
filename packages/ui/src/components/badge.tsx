import { cn } from "@bunship-ai/ui/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap px-2.5 py-1 transition-all duration-200 [border-radius:var(--ui-badge-radius)] [border-width:var(--ui-badge-border-width)] [font-family:var(--ui-badge-font-family)] [font-size:var(--ui-badge-font-size)] [font-weight:var(--ui-badge-font-weight)] [text-transform:var(--ui-badge-text-transform)] tracking-[var(--ui-badge-letter-spacing)] focus-visible:border-ring focus-visible:ring-[var(--ui-control-ring-width)] focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
	{
		variants: {
			variant: {
				default:
					"[background:var(--ui-badge-default-bg)] [border-color:var(--ui-badge-default-border)] [color:var(--ui-badge-default-foreground)] [a&]:hover:[background:var(--ui-badge-default-bg-hover)]",
				secondary:
					"[background:var(--ui-badge-secondary-bg)] [border-color:var(--ui-badge-secondary-border)] [color:var(--ui-badge-secondary-foreground)] [a&]:hover:[background:var(--ui-badge-secondary-bg-hover)]",
				destructive:
					"[background:var(--ui-badge-destructive-bg)] [border-color:var(--ui-badge-destructive-border)] [color:var(--ui-badge-destructive-foreground)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a&]:hover:[background:var(--ui-badge-destructive-bg-hover)]",
				outline:
					"[background:var(--ui-badge-outline-bg)] [border-color:var(--ui-badge-outline-border)] [color:var(--ui-badge-outline-foreground)] [a&]:hover:[background:var(--ui-badge-outline-bg-hover)] [a&]:hover:[color:var(--ui-badge-outline-foreground-hover)]",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			data-slot="badge"
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
