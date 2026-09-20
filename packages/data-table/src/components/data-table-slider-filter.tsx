"use client";

import { Button } from "@bunship-ai/ui/components/button";
import { Input } from "@bunship-ai/ui/components/input";
import { Label } from "@bunship-ai/ui/components/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bunship-ai/ui/components/popover";
import { Separator } from "@bunship-ai/ui/components/separator";
import { Slider } from "@bunship-ai/ui/components/slider";
import { cn } from "@bunship-ai/ui/lib/utils";
import type { Column } from "@tanstack/react-table";
import { PlusCircle, XCircle } from "lucide-react";
import * as React from "react";

interface Range {
	min: number;
	max: number;
}

type RangeValue = [number, number];

function getIsValidRange(value: unknown): value is RangeValue {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		typeof value[0] === "number" &&
		typeof value[1] === "number"
	);
}

function parseValuesAsNumbers(value: unknown): RangeValue | undefined {
	if (
		Array.isArray(value) &&
		value.length === 2 &&
		value.every(
			(v) =>
				(typeof v === "string" || typeof v === "number") && !Number.isNaN(v),
		)
	) {
		return [Number(value[0]), Number(value[1])];
	}

	return undefined;
}

interface DataTableSliderFilterProps<TData> {
	column: Column<TData, unknown>;
	title?: string;
}

export function DataTableSliderFilter<TData>({
	column,
	title,
}: DataTableSliderFilterProps<TData>) {
	const id = React.useId();

	const columnFilterValue = parseValuesAsNumbers(column.getFilterValue());

	const defaultRange = column.columnDef.meta?.range;
	const unit = column.columnDef.meta?.unit;

	const { min, max, step } = React.useMemo<Range & { step: number }>(() => {
		let minValue = 0;
		let maxValue = 100;

		if (defaultRange && getIsValidRange(defaultRange)) {
			[minValue, maxValue] = defaultRange;
		} else {
			const values = column.getFacetedMinMaxValues();
			if (values && Array.isArray(values) && values.length === 2) {
				const [facetMinValue, facetMaxValue] = values;
				if (
					typeof facetMinValue === "number" &&
					typeof facetMaxValue === "number"
				) {
					minValue = facetMinValue;
					maxValue = facetMaxValue;
				}
			}
		}

		const rangeSize = maxValue - minValue;
		const step =
			rangeSize <= 20
				? 1
				: rangeSize <= 100
					? Math.ceil(rangeSize / 20)
					: Math.ceil(rangeSize / 50);

		return { min: minValue, max: maxValue, step };
	}, [column, defaultRange]);

	const range = React.useMemo((): RangeValue => {
		return columnFilterValue ?? [min, max];
	}, [columnFilterValue, min, max]);

	const formatValue = React.useCallback((value: number) => {
		return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
	}, []);

	const onFromInputChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const numValue = Number(event.target.value);
			if (!Number.isNaN(numValue) && numValue >= min && numValue <= range[1]) {
				column.setFilterValue([numValue, range[1]]);
			}
		},
		[column, min, range],
	);

	const onToInputChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const numValue = Number(event.target.value);
			if (!Number.isNaN(numValue) && numValue <= max && numValue >= range[0]) {
				column.setFilterValue([range[0], numValue]);
			}
		},
		[column, max, range],
	);

	const onSliderValueChange = React.useCallback(
		(value: RangeValue) => {
			if (Array.isArray(value) && value.length === 2) {
				column.setFilterValue(value);
			}
		},
		[column],
	);

	const onReset = React.useCallback(
		(event: React.MouseEvent) => {
			if (event.target instanceof HTMLDivElement) {
				event.stopPropagation();
			}
			column.setFilterValue(undefined);
		},
		[column],
	);

	return (
		<Popover>
			<div className="inline-flex items-center gap-1">
			{columnFilterValue && (
				<Button type="button" variant="ghost" size="icon" aria-label={`Clear ${title} filter`} onClick={onReset}>
					<XCircle />
				</Button>
			)}
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="ui-toolbar-button border-dashed [box-shadow:var(--dt-control-shadow)]"
				>
					<PlusCircle />
					<span>{title}</span>
					{columnFilterValue ? (
						<>
							<Separator
								orientation="vertical"
								className="mx-0.5 data-[orientation=vertical]:h-4"
							/>
							{formatValue(columnFilterValue[0])} -{" "}
							{formatValue(columnFilterValue[1])}
							{unit ? ` ${unit}` : ""}
						</>
					) : null}
				</Button>
			</PopoverTrigger>
			</div>
			<PopoverContent
				align="start"
				className="dt-panel flex w-auto flex-col gap-4 bg-card"
			>
				<div className="flex flex-col gap-3">
					<p className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						{title}
					</p>
					<div className="flex items-center gap-4">
						<Label htmlFor={`${id}-from`} className="sr-only">
							From
						</Label>
						<div className="relative">
							<Input
								id={`${id}-from`}
								type="number"
								aria-valuemin={min}
								aria-valuemax={max}
								inputMode="numeric"
								pattern="[0-9]*"
								placeholder={min.toString()}
								min={min}
								max={max}
								value={range[0]?.toString()}
								onChange={onFromInputChange}
								className={cn("ui-toolbar-control w-24", unit && "pr-8")}
							/>
							{unit && (
								<span className="absolute top-0 right-0 bottom-0 flex items-center bg-accent px-2 text-muted-foreground text-sm [border-top-right-radius:var(--ui-field-radius)] [border-bottom-right-radius:var(--ui-field-radius)]">
									{unit}
								</span>
							)}
						</div>
						<Label htmlFor={`${id}-to`} className="sr-only">
							to
						</Label>
						<div className="relative">
							<Input
								id={`${id}-to`}
								type="number"
								aria-valuemin={min}
								aria-valuemax={max}
								inputMode="numeric"
								pattern="[0-9]*"
								placeholder={max.toString()}
								min={min}
								max={max}
								value={range[1]?.toString()}
								onChange={onToInputChange}
								className={cn("ui-toolbar-control w-24", unit && "pr-8")}
							/>
							{unit && (
								<span className="absolute top-0 right-0 bottom-0 flex items-center bg-accent px-2 text-muted-foreground text-sm [border-top-right-radius:var(--ui-field-radius)] [border-bottom-right-radius:var(--ui-field-radius)]">
									{unit}
								</span>
							)}
						</div>
					</div>
					<Label htmlFor={`${id}-slider`} className="sr-only">
						{title} slider
					</Label>
					<Slider
						id={`${id}-slider`}
						min={min}
						max={max}
						step={step}
						value={range}
						onValueChange={onSliderValueChange}
					/>
				</div>
				<Button
					aria-label={`Clear ${title} filter`}
					variant="outline"
					className="ui-toolbar-button [box-shadow:var(--dt-control-shadow)]"
					onClick={onReset}
				>
					Clear
				</Button>
			</PopoverContent>
		</Popover>
	);
}
