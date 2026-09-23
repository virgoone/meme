import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bunship-ai/ui/components/table";
import { cn } from "@bunship-ai/ui/lib/utils";
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import type * as React from "react";
import { getCommonPinningStyles } from "../lib/utils";
import { DataTablePagination } from "./data-table-pagination";
import { useDataTableTranslations } from "./data-table-provider";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
	table: TanstackTable<TData>;
	actionBar?: React.ReactNode;
	showPagination?: boolean;
}

export function DataTable<TData>({
	table,
	actionBar,
	children,
	className,
	showPagination = true,
	...props
}: DataTableProps<TData>) {
	const t = useDataTableTranslations();
	const hasExplicitColumnSizing = table
		.getAllLeafColumns()
		.some(
			(column) =>
				column.columnDef.size !== undefined ||
				column.columnDef.minSize !== undefined ||
				column.columnDef.maxSize !== undefined,
		);
	const tableMinWidth = hasExplicitColumnSizing
		? `${table.getTotalSize()}px`
		: undefined;
	const tableStyle = hasExplicitColumnSizing
		? { width: "100%", minWidth: tableMinWidth }
		: undefined;

	return (
		<div
			className={cn("flex w-full min-w-0 max-w-full flex-col gap-4", className)}
			{...props}
		>
			{children}
			<div
				data-slot="data-table-shell"
				className="dt-shell w-full min-w-0 overflow-hidden"
			>
				<div className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
					<Table
						className={cn(hasExplicitColumnSizing && "table-fixed")}
						style={tableStyle}
					>
						<TableHeader className="dt-header">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id} className="dt-row">
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											colSpan={header.colSpan}
											className="dt-header-cell dt-label h-11 text-[10px] first:pl-6 last:pr-6"
											style={{
												...getCommonPinningStyles({
													column: header.column,
													withBorder: true,
												}),
											}}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
										className="dt-row"
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className="first:pl-6 last:pr-6"
												style={{
													...getCommonPinningStyles({
														column: cell.column,
														withBorder: true,
													}),
												}}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={table.getAllColumns().length}
										className="h-32 text-center"
									>
										<div className="flex flex-col items-center justify-center gap-2 py-8">
											<div className="dt-empty-icon dt-panel flex h-12 w-12 items-center justify-center">
												<svg
													aria-hidden="true"
													className="h-6 w-6 text-muted-foreground"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													strokeWidth={2}
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
													/>
												</svg>
											</div>
											<p className="font-medium text-muted-foreground text-sm">
												{t("noResults")}
											</p>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
			{(showPagination || actionBar) && (
				<div className="flex min-w-0 flex-col gap-3">
					{showPagination && <DataTablePagination table={table} />}
					{actionBar &&
						table.getFilteredSelectedRowModel().rows.length > 0 &&
						actionBar}
				</div>
			)}
		</div>
	);
}
