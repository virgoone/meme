"use client";

import * as React from "react";
import { dataTableTranslations } from "../locales";

type DataTableTranslations = typeof dataTableTranslations.en;
type DataTableLocale = keyof typeof dataTableTranslations;

interface DataTableContextValue {
	translations: DataTableTranslations;
	locale: DataTableLocale;
}

const DataTableContext = React.createContext<DataTableContextValue | undefined>(
	undefined,
);

interface DataTableProviderProps {
	children: React.ReactNode;
	locale?: DataTableLocale;
	translations?: DataTableTranslations;
}

/**
 * Provider for data-table translations.
 *
 * @example
 * ```tsx
 * import { DataTableProvider, dataTableTranslations } from '@bunship-ai/data-table';
 *
 * <DataTableProvider locale="en" translations={dataTableTranslations.en}>
 *   <YourApp />
 * </DataTableProvider>
 * ```
 */
export function DataTableProvider({
	children,
	locale = "en",
	translations,
}: DataTableProviderProps) {
	const value = React.useMemo(
		() => ({
			translations: translations || dataTableTranslations[locale],
			locale,
		}),
		[translations, locale],
	);

	return (
		<DataTableContext.Provider value={value}>
			{children}
		</DataTableContext.Provider>
	);
}

/**
 * Flatten nested translation object into a flat key-value map
 * e.g. { pagination: { page: "Page" } } -> { "pagination.page": "Page" }
 */
function flattenTranslations(
	obj: Record<string, any>,
	prefix = "",
): Map<string, string> {
	const result = new Map<string, string>();

	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;

		if (typeof value === "string") {
			result.set(fullKey, value);
		} else if (typeof value === "object" && value !== null) {
			const nested = flattenTranslations(value, fullKey);
			for (const [nestedKey, nestedValue] of nested) {
				result.set(nestedKey, nestedValue);
			}
		}
	}

	return result;
}

/**
 * Replace placeholders in a string with actual values
 * Optimized version that only processes if placeholders exist
 */
function interpolate(
	template: string,
	values: Record<string, string | number>,
): string {
	// Quick check: if no placeholders, return immediately
	if (!template.includes("{")) {
		return template;
	}

	// Use replace with a function for better performance
	return template.replace(/\{(\w+)\}/g, (_, key) =>
		key in values ? String(values[key]) : `{${key}}`,
	);
}

/**
 * Hook to access data-table translations.
 *
 * @param namespace - Optional namespace to scope translations (e.g., "pagination", "toolbar")
 * @returns Translation function
 */
export function useDataTableTranslations(namespace?: string) {
	const context = React.useContext(DataTableContext);

	if (!context) {
		throw new Error(
			"useDataTableTranslations must be used within a DataTableProvider",
		);
	}

	// Memoize the flattened translations map
	const flatMap = React.useMemo(
		() => flattenTranslations(context.translations),
		[context.translations],
	);

	// Return a stable translation function
	return React.useCallback(
		(key: string, values?: Record<string, string | number>): string => {
			// Construct the full key
			const fullKey = namespace ? `${namespace}.${key}` : key;

			// Fast lookup in the flat map
			const template = flatMap.get(fullKey);

			if (!template) {
				if (process.env.NODE_ENV === "development") {
					console.warn(`[data-table] Translation missing: "${fullKey}"`);
				}
				return key;
			}

			// If no values, return template directly
			if (!values) {
				return template;
			}

			// Interpolate values
			return interpolate(template, values);
		},
		[flatMap, namespace],
	);
}
