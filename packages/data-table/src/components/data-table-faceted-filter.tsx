"use client";

import { Badge } from "@bunship-ai/ui/components/badge";
import { Button } from "@bunship-ai/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@bunship-ai/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bunship-ai/ui/components/popover";
import { Separator } from "@bunship-ai/ui/components/separator";
import { cn } from "@bunship-ai/ui/lib/utils";
import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle, XCircle } from "lucide-react";
import * as React from "react";
import { useDataTableTranslations } from "./data-table-provider";

export interface Option {
	label: string;
	value: string;
	icon?: React.ComponentType<{ className?: string }>;
	count?: number;
}

interface DataTableFacetedFilterProps<TData, TValue> {
	column?: Column<TData, TValue>;
	title?: string;
	options: Option[];
	multiple?: boolean;
}

export function DataTableFacetedFilter<TData, TValue>({
	column,
	title,
	options,
	multiple,
}: DataTableFacetedFilterProps<TData, TValue>) {
	const t = useDataTableTranslations("filter");
	const [open, setOpen] = React.useState(false);

	// Convert title to string for placeholder if it's a React element
	const placeholderText = typeof title === "string" ? title : t("search");

	const columnFilterValue = column?.getFilterValue();
	const selectedValues = new Set(
		Array.isArray(columnFilterValue) ? columnFilterValue : [],
	);

	const onItemSelect = React.useCallback(
		(option: Option, isSelected: boolean) => {
			if (!column) return;

			if (multiple) {
				const newSelectedValues = new Set(selectedValues);
				if (isSelected) {
					newSelectedValues.delete(option.value);
				} else {
					newSelectedValues.add(option.value);
				}
				const filterValues = Array.from(newSelectedValues);
				column.setFilterValue(filterValues.length ? filterValues : undefined);
			} else {
				column.setFilterValue(isSelected ? undefined : [option.value]);
				setOpen(false);
			}
		},
		[column, multiple, selectedValues],
	);

	const onReset = React.useCallback(
		(event?: React.MouseEvent) => {
			event?.stopPropagation();
			column?.setFilterValue(undefined);
		},
		[column],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<div className="inline-flex items-center gap-1">
			{selectedValues.size > 0 && (
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
					{title}
					{selectedValues?.size > 0 && (
						<>
							<Separator
								orientation="vertical"
								className="mx-0.5 data-[orientation=vertical]:h-4"
							/>
							<Badge
								variant="secondary"
								className="px-1 font-normal [border-radius:var(--dt-control-radius)] lg:hidden"
							>
								{selectedValues.size}
							</Badge>
							<div className="hidden items-center gap-1 lg:flex">
								{selectedValues.size > 2 ? (
									<Badge
										variant="secondary"
										className="px-1 font-normal [border-radius:var(--dt-control-radius)]"
									>
										{selectedValues.size} {t("selected")}
									</Badge>
								) : (
									options
										.filter((option) => selectedValues.has(option.value))
										.map((option) => (
											<Badge
												variant="secondary"
												key={option.value}
												className="px-1 font-normal [border-radius:var(--dt-control-radius)]"
											>
												{option.label}
											</Badge>
										))
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			</div>
			<PopoverContent
				className="w-50 p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder={placeholderText} />
					<CommandList className="max-h-full">
						<CommandEmpty>{t("noResults")}</CommandEmpty>
						<CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
							{options.map((option) => {
								const isSelected = selectedValues.has(option.value);

								return (
									<CommandItem
										key={option.value}
										onSelect={() => onItemSelect(option, isSelected)}
									>
										<div
											className={cn(
												"flex size-4 items-center justify-center border border-primary transition-colors [border-radius:var(--dt-control-radius)]",
												isSelected
													? "bg-primary text-primary-foreground"
													: "bg-background opacity-60 [&_svg]:invisible",
											)}
										>
											<Check className="size-3.5 text-primary-foreground" />
										</div>
										{option.icon && <option.icon />}
										<span className="truncate">{option.label}</span>
										{option.count && (
											<span className="ml-auto font-mono text-xs">
												{option.count}
											</span>
										)}
									</CommandItem>
								);
							})}
						</CommandGroup>
						{selectedValues.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => onReset()}
										className="justify-center text-center"
									>
										{t("clearFilters")}
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
