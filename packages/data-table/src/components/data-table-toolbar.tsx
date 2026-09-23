"use client";

import { Button } from "@bunship-ai/ui/components/button";
import { Input } from "@bunship-ai/ui/components/input";
import { cn } from "@bunship-ai/ui/lib/utils";
import type { Column, Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import * as React from "react";
import { DataTableDateFilter } from "./data-table-date-filter";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { useDataTableTranslations } from "./data-table-provider";
import { DataTableSliderFilter } from "./data-table-slider-filter";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
	table: Table<TData>;
}

export function DataTableToolbar<TData>({
	table,
	children,
	className,
	...props
}: DataTableToolbarProps<TData>) {
	const t = useDataTableTranslations("toolbar");
	const isFiltered = table.getState().columnFilters.length > 0;

	const columns = React.useMemo(
		() => table.getAllColumns().filter((column) => column.getCanFilter()),
		[table],
	);

	const onReset = React.useCallback(() => {
		table.resetColumnFilters();
	}, [table]);

	return (
		<div
			role="toolbar"
			aria-orientation="horizontal"
			aria-label={t("label")}
			className={cn(
				"dt-panel flex w-full min-w-0 max-w-full items-start justify-between gap-3 p-3",
				className,
			)}
			{...props}
		>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				{columns.map((column) => (
					<DataTableToolbarFilter key={column.id} column={column} />
				))}
				{isFiltered && (
					<Button
						aria-label={t("resetFilters")}
						variant="outline"
						className="dt-control ui-toolbar-button gap-1.5 border-dashed shadow-none active:translate-y-[1px]"
						onClick={onReset}
					>
						<X className="h-3.5 w-3.5" />
						{t("reset")}
					</Button>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{children}
				<DataTableViewOptions table={table} align="end" />
			</div>
		</div>
	);
}
interface DataTableToolbarFilterProps<TData> {
	column: Column<TData>;
}

function DataTableToolbarFilter<TData>({
	column,
}: DataTableToolbarFilterProps<TData>) {
	const columnMeta = column.columnDef.meta;

	const onFilterRender = React.useCallback(() => {
		if (!columnMeta?.variant) return null;

		switch (columnMeta.variant) {
			case "text":
				return (
					<Input
						placeholder={columnMeta.placeholder ?? columnMeta.label}
						value={(column.getFilterValue() as string) ?? ""}
						onChange={(event) => column.setFilterValue(event.target.value)}
						className="dt-control ui-toolbar-control min-w-32 max-w-56"
					/>
				);

			case "number":
				return (
					<div className="relative">
						<Input
							type="number"
							inputMode="numeric"
							placeholder={columnMeta.placeholder ?? columnMeta.label}
							value={(column.getFilterValue() as string) ?? ""}
							onChange={(event) => column.setFilterValue(event.target.value)}
							className={cn(
								"dt-control ui-toolbar-control min-w-24 max-w-32",
								columnMeta.unit && "pr-9",
							)}
						/>
						{columnMeta.unit && (
							<span className="dt-unit-badge absolute top-1/2 right-2 -translate-y-1/2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
								{columnMeta.unit}
							</span>
						)}
					</div>
				);

			case "range":
				return (
					<DataTableSliderFilter
						column={column}
						title={columnMeta.label ?? column.id}
					/>
				);

			case "date":
			case "dateRange":
				return (
					<DataTableDateFilter
						column={column}
						title={columnMeta.label ?? column.id}
						multiple={columnMeta.variant === "dateRange"}
					/>
				);

			case "select":
			case "multiSelect":
				return (
					<DataTableFacetedFilter
						column={column}
						title={columnMeta.label ?? column.id}
						options={columnMeta.options ?? []}
						multiple={columnMeta.variant === "multiSelect"}
					/>
				);

			default:
				return null;
		}
	}, [column, columnMeta]);

	return onFilterRender();
}
