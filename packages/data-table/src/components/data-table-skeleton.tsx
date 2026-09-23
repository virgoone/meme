import { Skeleton } from "@bunship-ai/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bunship-ai/ui/components/table";
import { cn } from "@bunship-ai/ui/lib/utils";

interface DataTableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	columnCount: number;
	rowCount?: number;
	filterCount?: number;
	cellWidths?: string[];
	withViewOptions?: boolean;
	withPagination?: boolean;
	shrinkZero?: boolean;
}

export function DataTableSkeleton({
	columnCount,
	rowCount = 10,
	filterCount = 0,
	cellWidths = ["auto"],
	withViewOptions = true,
	withPagination = true,
	shrinkZero = false,
	className,
	...props
}: DataTableSkeletonProps) {
	const cozyCellWidths = Array.from(
		{ length: columnCount },
		(_, index) => cellWidths[index % cellWidths.length] ?? "auto",
	);
	const filterSkeletonIds = Array.from(
		{ length: filterCount },
		(_, index) => `filter-skeleton-${index + 1}`,
	);
	const columnSkeletonIds = Array.from(
		{ length: columnCount },
		(_, index) => `column-skeleton-${index + 1}`,
	);
	const rowSkeletonIds = Array.from(
		{ length: rowCount },
		(_, index) => `row-skeleton-${index + 1}`,
	);

	return (
		<div
			className={cn("flex w-full min-w-0 max-w-full flex-col gap-4", className)}
			{...props}
		>
			<div className="dt-panel flex w-full items-center justify-between gap-3 p-4">
				<div className="flex flex-1 items-center gap-2">
					{filterCount > 0
						? filterSkeletonIds.map((filterId) => (
								<Skeleton
									key={filterId}
									className="h-8 w-24 [border-radius:var(--dt-control-radius)]"
								/>
							))
						: null}
				</div>
				{withViewOptions ? (
					<Skeleton className="ml-auto hidden h-8 w-24 [border-radius:var(--dt-control-radius)] lg:flex" />
				) : null}
			</div>
			<div className="dt-shell overflow-hidden">
				<div className="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain">
					<Table>
						<TableHeader className="dt-header">
							<TableRow className="dt-row border-b">
								{columnSkeletonIds.map((columnId, columnIndex) => (
									<TableHead
										key={columnId}
										className="first:pl-6 last:pr-6"
										style={{
											width: cozyCellWidths[columnIndex],
											minWidth: shrinkZero
												? cozyCellWidths[columnIndex]
												: "auto",
										}}
									>
										<Skeleton className="h-5 w-full [border-radius:var(--dt-control-radius)]" />
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{rowSkeletonIds.map((rowId, rowIndex) => (
								<TableRow
									key={rowId}
									className="dt-row border-b"
									style={{
										animationDelay: `${rowIndex * 30}ms`,
										animation:
											"pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
									}}
								>
									{columnSkeletonIds.map((columnId, columnIndex) => (
										<TableCell
											key={`${rowId}-${columnId}`}
											className="first:pl-6 last:pr-6"
											style={{
												width: cozyCellWidths[columnIndex],
												minWidth: shrinkZero
													? cozyCellWidths[columnIndex]
													: "auto",
											}}
										>
											<Skeleton className="h-5 w-full [border-radius:var(--dt-control-radius)]" />
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
			{withPagination ? (
				<div className="dt-pagination dt-panel flex w-full items-center justify-between gap-4 overflow-auto p-4 sm:gap-8">
					<Skeleton className="h-6 w-40 shrink-0 [border-radius:var(--dt-control-radius)]" />
					<div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
						<div className="flex items-center gap-2">
							<Skeleton className="h-6 w-24 [border-radius:var(--dt-control-radius)]" />
							<Skeleton className="h-8 w-18 [border-radius:var(--dt-control-radius)]" />
						</div>
						<Skeleton className="h-6 w-20 [border-radius:var(--dt-control-radius)]" />
						<div className="flex items-center gap-1.5">
							<Skeleton className="hidden size-8 [border-radius:var(--dt-control-radius)] lg:block" />
							<Skeleton className="size-8 [border-radius:var(--dt-control-radius)]" />
							<Skeleton className="size-8 [border-radius:var(--dt-control-radius)]" />
							<Skeleton className="hidden size-8 [border-radius:var(--dt-control-radius)] lg:block" />
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
