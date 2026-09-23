"use client";

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bunship-ai/ui/components/dropdown-menu";
import { cn } from "@bunship-ai/ui/lib/utils";
import type { Column } from "@tanstack/react-table";
import {
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	EyeOff,
	X,
} from "lucide-react";
import { useDataTableTranslations } from "./data-table-provider";

interface DataTableColumnHeaderProps<TData, TValue>
	extends Omit<React.ComponentProps<typeof DropdownMenuTrigger>, "title"> {
	column: Column<TData, TValue>;
	title: React.ReactNode;
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
	...props
}: DataTableColumnHeaderProps<TData, TValue>) {
	const t = useDataTableTranslations("columnHeader");

	if (!column.getCanSort() && !column.getCanHide()) {
		return <div className={cn(className)}>{title}</div>;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"dt-control -ml-1.5 inline-flex h-8 items-center gap-1.5 border-transparent bg-transparent px-2 py-1.5 font-medium text-foreground/80 transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-border hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring active:translate-y-[1px] data-[state=open]:border-border [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
					className,
				)}
				{...props}
			>
				{title}
				{column.getCanSort() &&
					(column.getIsSorted() === "desc" ? (
						<ChevronDown className="transition-transform" />
					) : column.getIsSorted() === "asc" ? (
						<ChevronUp className="transition-transform" />
					) : (
						<ChevronsUpDown className="transition-transform" />
					))}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="dt-panel w-36 p-1.5">
				{column.getCanSort() && (
					<>
						<DropdownMenuCheckboxItem
							className="relative px-2 py-1.5 pr-8 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
							checked={column.getIsSorted() === "asc"}
							onClick={() => column.toggleSorting(false)}
						>
							<ChevronUp />
							{t("asc")}
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							className="relative px-2 py-1.5 pr-8 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
							checked={column.getIsSorted() === "desc"}
							onClick={() => column.toggleSorting(true)}
						>
							<ChevronDown />
							{t("desc")}
						</DropdownMenuCheckboxItem>
						{column.getIsSorted() && (
							<DropdownMenuItem
								className="px-2 py-1.5 [&_svg]:text-muted-foreground"
								onClick={() => column.clearSorting()}
							>
								<X />
								{t("reset")}
							</DropdownMenuItem>
						)}
					</>
				)}
				{column.getCanHide() && (
					<DropdownMenuCheckboxItem
						className="relative px-2 py-1.5 pr-8 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
						checked={!column.getIsVisible()}
						onClick={() => column.toggleVisibility(false)}
					>
						<EyeOff />
						{t("hide")}
					</DropdownMenuCheckboxItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
