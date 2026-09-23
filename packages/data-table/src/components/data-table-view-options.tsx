"use client";

import { Button } from "@bunship-ai/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@bunship-ai/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bunship-ai/ui/components/popover";
import { cn } from "@bunship-ai/ui/lib/utils";
import type { Table } from "@tanstack/react-table";
import { Check, Settings2 } from "lucide-react";
import * as React from "react";
import { useDataTableTranslations } from "./data-table-provider";

interface DataTableViewOptionsProps<TData>
	extends React.ComponentProps<typeof PopoverContent> {
	table: Table<TData>;
}

export function DataTableViewOptions<TData>({
	table,
	...props
}: DataTableViewOptionsProps<TData>) {
	const t = useDataTableTranslations("viewOptions");
	const columns = React.useMemo(
		() =>
			table
				.getAllColumns()
				.filter(
					(column) =>
						typeof column.accessorFn !== "undefined" && column.getCanHide(),
				),
		[table],
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					aria-label={t("toggleColumns")}
					role="combobox"
					variant="outline"
					className="dt-control ui-toolbar-button ml-auto hidden transition-colors duration-200 active:translate-y-[1px] lg:flex"
				>
					<Settings2 className="text-muted-foreground" />
					{t("view")}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="dt-panel w-48 p-0" {...props}>
				<Command>
					<CommandInput placeholder={t("searchColumns")} className="text-sm" />
					<CommandList>
						<CommandEmpty>{t("noColumnsFound")}</CommandEmpty>
						<CommandGroup>
							{columns.map((column) => (
								<CommandItem
									key={column.id}
									onSelect={() =>
										column.toggleVisibility(!column.getIsVisible())
									}
									className="font-medium"
								>
									<span className="truncate">
										{column.columnDef.meta?.label ?? column.id}
									</span>
									<Check
										className={cn(
											"ml-auto size-4 shrink-0",
											column.getIsVisible() ? "opacity-100" : "opacity-0",
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
