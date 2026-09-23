"use client";

import { cn } from "@bunship-ai/ui/lib/utils";
import type * as React from "react";

function Table({ className, ...props }: React.ComponentProps<"table">) {
	return (
		<table
			data-slot="table"
			className={cn("w-full min-w-full caption-bottom text-sm", className)}
			{...props}
		/>
	);
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
	return (
		<thead
			data-slot="table-header"
			className={cn(
				"bg-secondary [&_tr]:border-border [&_tr]:[border-bottom-width:var(--ui-table-row-border-width)]",
				className,
			)}
			{...props}
		/>
	);
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
	return (
		<tbody
			data-slot="table-body"
			className={cn("[&_tr:last-child]:border-0", className)}
			{...props}
		/>
	);
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn(
				"border-border bg-muted/70 font-medium [border-top-width:var(--ui-table-row-border-width)] [&>tr]:last:border-b-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		<tr
			data-slot="table-row"
			className={cn(
				"border-border transition-colors [border-bottom-width:var(--ui-table-row-border-width)] hover:bg-muted/60 data-[state=selected]:bg-accent/55",
				className,
			)}
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			data-slot="table-head"
			className={cn(
				"h-10 whitespace-nowrap px-3 text-left align-middle font-bold text-muted-foreground [font-family:var(--ui-table-head-font-family)] [font-size:var(--ui-table-head-font-size)] [line-height:var(--ui-table-head-line-height)] [text-transform:var(--ui-table-head-text-transform)] tracking-[var(--ui-table-head-letter-spacing)] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			data-slot="table-cell"
			className={cn(
				"whitespace-nowrap p-3 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className,
			)}
			{...props}
		/>
	);
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<"caption">) {
	return (
		<caption
			data-slot="table-caption"
			className={cn(
				"mt-4 text-muted-foreground [font-family:var(--ui-table-caption-font-family)] [font-size:var(--ui-table-caption-font-size)] [line-height:var(--ui-table-caption-line-height)] [text-transform:var(--ui-table-caption-text-transform)] tracking-[var(--ui-table-caption-letter-spacing)]",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
};
