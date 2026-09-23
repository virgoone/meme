"use client";

import { cn } from "@bunship-ai/ui/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import type * as React from "react";

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"flex select-none items-center gap-2 font-medium text-sm leading-[1.35] peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground peer-disabled:opacity-100 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-muted-foreground group-data-[disabled=true]:opacity-100",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
