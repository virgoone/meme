import { Button } from "@bunship-ai/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bunship-ai/ui/components/select";
import { cn } from "@bunship-ai/ui/lib/utils";
import type { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { useDataTableTranslations } from "./data-table-provider";

interface DataTablePaginationProps<TData>
	extends React.HTMLAttributes<HTMLDivElement> {
	table: Table<TData>;
	pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
	table,
	pageSizeOptions = [10, 20, 30, 40, 50],
	className,
	...props
}: DataTablePaginationProps<TData>) {
	const t = useDataTableTranslations("pagination");

	const hasSelection = table.getFilteredSelectedRowModel().rows.length > 0;

	return (
		<div
			className={cn(
				"dt-pagination dt-shell relative flex w-full min-w-0 max-w-full flex-wrap items-center justify-between gap-2 overflow-hidden p-3 sm:flex-nowrap sm:gap-8 sm:p-4",
				className,
			)}
			{...props}
		>
			<div className="min-w-0 flex-1 whitespace-nowrap text-muted-foreground text-sm empty:hidden sm:block">
				{hasSelection && (
					<span className="dt-selection-badge inline-flex items-center px-3 py-1 font-medium text-warning-foreground">
						{t("rowsSelected", {
							count: table.getFilteredSelectedRowModel().rows.length,
							total: table.getFilteredRowModel().rows.length,
						})}
					</span>
				)}
			</div>
			<div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-6 lg:gap-8">
				<div className="order-3 flex items-center space-x-2 sm:order-1">
					<p className="whitespace-nowrap font-medium text-muted-foreground text-xs tracking-tight">
						{t("rowsPerPage")}
					</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="dt-control h-8 w-18 data-size:h-8">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top" className="dt-panel">
							{pageSizeOptions.map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="dt-page-indicator order-2 flex h-8 items-center justify-center px-3 font-medium font-mono text-foreground text-xs tracking-tight sm:order-2">
					{t("page", {
						page: table.getState().pagination.pageIndex + 1,
						total: table.getPageCount(),
					})}
				</div>
				<div className="order-1 flex items-center space-x-1.5 sm:order-3">
					<Button
						aria-label={t("goToFirstPage")}
						variant="outline"
						size="icon"
						className="dt-control hidden size-8 transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:translate-y-[1px] lg:flex"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronsLeft className="h-4 w-4" />
					</Button>
					<Button
						aria-label={t("goToPreviousPage")}
						variant="outline"
						size="icon"
						className="dt-control size-8 transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:translate-y-[1px]"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						aria-label={t("goToNextPage")}
						variant="outline"
						size="icon"
						className="dt-control size-8 transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:translate-y-[1px]"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						aria-label={t("goToLastPage")}
						variant="outline"
						size="icon"
						className="dt-control hidden size-8 transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:translate-y-[1px] lg:flex"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<ChevronsRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
