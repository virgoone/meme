import { cn } from "@bunship-ai/ui/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap outline-none transition-all duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] [border-radius:var(--ui-button-radius)] [border-width:var(--ui-button-border-width)] [box-shadow:var(--ui-button-shadow)] [font-family:var(--ui-button-font-family)] [font-size:var(--ui-button-font-size)] [font-weight:var(--ui-button-font-weight)] [line-height:var(--ui-button-line-height)] [text-transform:var(--ui-button-text-transform)] tracking-[var(--ui-button-letter-spacing)] focus-visible:ring-[var(--ui-control-ring-width)] focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-destructive/25 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"[background:var(--ui-button-default-bg)] [border-color:var(--ui-button-default-border)] [color:var(--ui-button-default-foreground)] [border-width:var(--ui-button-emphasis-border-width)] [box-shadow:var(--ui-button-emphasis-shadow)] hover:translate-x-[var(--ui-button-hover-translate-x)] hover:translate-y-[var(--ui-button-hover-translate-y)] hover:[background:var(--ui-button-default-bg-hover)] hover:[box-shadow:var(--ui-button-emphasis-shadow-hover)] active:translate-x-[var(--ui-button-active-translate-x)] active:translate-y-[var(--ui-button-active-translate-y)] active:[background:var(--ui-button-default-bg-active)] active:[box-shadow:var(--ui-button-shadow-active)]",
				destructive:
					"[background:var(--ui-button-destructive-bg)] [border-color:var(--ui-button-destructive-border)] [color:var(--ui-button-destructive-foreground)] [border-width:var(--ui-button-emphasis-border-width)] [box-shadow:var(--ui-button-emphasis-shadow)] hover:translate-x-[var(--ui-button-hover-translate-x)] hover:translate-y-[var(--ui-button-hover-translate-y)] hover:[background:var(--ui-button-destructive-bg-hover)] hover:[box-shadow:var(--ui-button-emphasis-shadow-hover)] active:translate-x-[var(--ui-button-active-translate-x)] active:translate-y-[var(--ui-button-active-translate-y)] active:[background:var(--ui-button-destructive-bg-active)] active:[box-shadow:var(--ui-button-shadow-active)] focus-visible:ring-destructive/25 dark:focus-visible:ring-destructive/40",
				outline:
					"[background:var(--ui-button-outline-bg)] [border-color:var(--ui-button-outline-border)] [color:var(--ui-button-outline-foreground)] hover:[background:var(--ui-button-outline-bg-hover)]",
				secondary:
					"[background:var(--ui-button-secondary-bg)] [border-color:var(--ui-button-secondary-border)] [color:var(--ui-button-secondary-foreground)] hover:[background:var(--ui-button-secondary-bg-hover)]",
				ghost:
					"border-transparent bg-transparent [box-shadow:none] [color:var(--ui-button-ghost-foreground)] hover:[border-color:var(--ui-button-ghost-border-hover)] hover:[background:var(--ui-button-ghost-bg-hover)]",
				link: "border-transparent bg-transparent p-0 [box-shadow:none] [color:var(--ui-button-link-color)] [font-family:var(--ui-button-link-font-family)] [font-size:var(--ui-button-link-font-size)] [font-weight:var(--ui-button-link-font-weight)] [text-decoration:var(--ui-button-link-decoration)] [text-transform:var(--ui-button-link-text-transform)] tracking-[var(--ui-button-link-letter-spacing)] underline-offset-4 hover:[color:var(--ui-button-link-hover-color)] hover:[text-decoration:var(--ui-button-link-hover-decoration)]",
			},
			size: {
				default:
					"min-h-[var(--ui-button-min-height)] px-[var(--ui-button-padding-x)] py-[var(--ui-button-padding-y)]",
				sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
				lg: "h-11 px-6 text-sm has-[>svg]:px-4",
				icon: "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		if (asChild) {
			return (
				<Slot
					data-slot="button"
					className={cn(buttonVariants({ variant, size, className }))}
					{...props}
				/>
			);
		}

		return (
			<button
				ref={ref}
				data-slot="button"
				className={cn(buttonVariants({ variant, size, className }))}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
