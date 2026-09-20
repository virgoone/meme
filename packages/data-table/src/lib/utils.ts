import type { Column } from "@tanstack/react-table";
import { dataTableConfig } from "../config";
import type {
	ExtendedColumnFilter,
	FilterOperator,
	FilterVariant,
} from "../types";

export function getCommonPinningStyles<TData>({
	column,
	withBorder = false,
}: {
	column: Column<TData>;
	withBorder?: boolean;
}): React.CSSProperties {
	const isPinned = column.getIsPinned();
	const hasExplicitWidth =
		column.columnDef.size !== undefined ||
		column.columnDef.minSize !== undefined ||
		column.columnDef.maxSize !== undefined;
	const isLastLeftPinnedColumn =
		isPinned === "left" && column.getIsLastColumn("left");
	const isFirstRightPinnedColumn =
		isPinned === "right" && column.getIsFirstColumn("right");
	const edgeShadow = withBorder
		? isLastLeftPinnedColumn
			? "inset -1px 0 0 hsl(var(--border) / 0.88), 10px 0 18px -18px hsl(var(--foreground) / 0.12)"
			: isFirstRightPinnedColumn
				? "inset 1px 0 0 hsl(var(--border) / 0.88), -10px 0 18px -18px hsl(var(--foreground) / 0.12)"
				: undefined
		: undefined;

	return {
		boxShadow: edgeShadow,
		left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
		right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
		opacity: 1,
		position: isPinned ? "sticky" : undefined,
		background: isPinned ? "var(--background)" : undefined,
		minWidth: isPinned || hasExplicitWidth ? column.getSize() : undefined,
		width: isPinned || hasExplicitWidth ? column.getSize() : undefined,
		zIndex: isPinned ? 2 : undefined,
	};
}

export function getFilterOperators(filterVariant: FilterVariant) {
	const operatorMap: Record<
		FilterVariant,
		{ label: string; value: FilterOperator }[]
	> = {
		text: dataTableConfig.textOperators,
		number: dataTableConfig.numericOperators,
		range: dataTableConfig.numericOperators,
		date: dataTableConfig.dateOperators,
		dateRange: dataTableConfig.dateOperators,
		boolean: dataTableConfig.booleanOperators,
		select: dataTableConfig.selectOperators,
		multiSelect: dataTableConfig.multiSelectOperators,
	};

	return operatorMap[filterVariant] ?? dataTableConfig.textOperators;
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
	const operators = getFilterOperators(filterVariant);

	return operators[0]?.value ?? (filterVariant === "text" ? "iLike" : "eq");
}

export function getValidFilters<TData>(
	filters: ExtendedColumnFilter<TData>[],
): ExtendedColumnFilter<TData>[] {
	return filters.filter(
		(filter) =>
			filter.operator === "isEmpty" ||
			filter.operator === "isNotEmpty" ||
			(Array.isArray(filter.value)
				? filter.value.length > 0
				: filter.value !== "" &&
					filter.value !== null &&
					filter.value !== undefined),
	);
}
