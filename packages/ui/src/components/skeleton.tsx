import { cn } from "@bunship-ai/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn(
				"relative overflow-hidden rounded-xl bg-muted/50",
				"before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
				className,
			)}
			style={{
				backgroundSize: "200% 100%",
			}}
			{...props}
		/>
	);
}

export { Skeleton };
