import { cn } from "@bunship-ai/ui/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";

type TechThemeScopeProps = React.ComponentPropsWithoutRef<"div"> & {
	theme?: "gen-sys" | "signal-grid" | "warm-terminal";
	styleMode?: "hard-edge" | "default" | "terminal";
};

type TechPrimitiveProps = React.ComponentPropsWithoutRef<"div"> & {
	asChild?: boolean;
};

function TechThemeScope({
	className,
	theme = "gen-sys",
	styleMode = "hard-edge",
	...props
}: TechThemeScopeProps) {
	return (
		<div
			data-ui-theme={theme}
			data-ui-style={styleMode}
			className={cn(className)}
			{...props}
		/>
	);
}

function TechShell({ className, asChild = false, ...props }: TechPrimitiveProps) {
	const Comp = asChild ? Slot : "div";
	return <Comp className={cn("mk-shell", className)} {...props} />;
}

function TechSurface({
	className,
	asChild = false,
	...props
}: TechPrimitiveProps) {
	const Comp = asChild ? Slot : "div";
	return <Comp className={cn("mk-surface", className)} {...props} />;
}

function TechCard({ className, asChild = false, ...props }: TechPrimitiveProps) {
	const Comp = asChild ? Slot : "div";
	return <Comp className={cn("mk-card", className)} {...props} />;
}

function TechPanel({ className, asChild = false, ...props }: TechPrimitiveProps) {
	const Comp = asChild ? Slot : "div";
	return <Comp className={cn("mk-panel", className)} {...props} />;
}

function TechChip({ className, asChild = false, ...props }: TechPrimitiveProps) {
	const Comp = asChild ? Slot : "div";
	return <Comp className={cn("mk-chip", className)} {...props} />;
}

export { TechThemeScope, TechShell, TechSurface, TechCard, TechPanel, TechChip };
