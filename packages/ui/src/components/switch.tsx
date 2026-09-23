"use client";

import { cn } from "@bunship-ai/ui/lib/utils";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";

function Switch({
	className,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-sm outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input disabled:cursor-not-allowed disabled:border-border/75 disabled:bg-muted disabled:shadow-none disabled:opacity-100",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 peer-disabled:bg-muted-foreground/70 peer-disabled:shadow-none",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
