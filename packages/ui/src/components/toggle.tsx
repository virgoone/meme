"use client";

import { cn } from "@bunship-ai/ui/lib/utils";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const toggleVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-none transition-[color,box-shadow,background-color,border-color] [border-radius:var(--ui-control-radius)] focus-visible:border-ring focus-visible:ring-[var(--ui-control-ring-width)] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:[background:var(--ui-toggle-bg-active)] data-[state=on]:[color:var(--ui-toggle-foreground-active)] dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-transparent [border-width:var(--ui-control-border-width)] [box-shadow:none] hover:border-border hover:[background:var(--ui-toggle-bg-hover)] hover:[color:var(--ui-toggle-foreground-hover)]",
				outline:
					"border-input bg-transparent [border-width:var(--ui-control-border-width)] [box-shadow:var(--ui-control-shadow)] hover:[background:var(--ui-toggle-bg-hover)] hover:[color:var(--ui-toggle-foreground-hover)]",
			},
			size: {
				default: "h-9 min-w-9 px-2",
				sm: "h-8 min-w-8 px-1.5",
				lg: "h-10 min-w-10 px-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Toggle({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
	VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive.Root
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
