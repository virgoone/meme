import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import ja from "./ja.json";
import zh from "./zh.json";

export const dataTableTranslations = {
	en,
	de,
	es,
	ja,
	zh,
} as const;

export type DataTableLocale = keyof typeof dataTableTranslations;
