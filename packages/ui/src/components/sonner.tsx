"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster bunship-toaster"
			closeButton
			toastOptions={{
				classNames: {
					toast: "bunship-toast",
					title: "bunship-toast-title",
					description: "bunship-toast-description",
					actionButton: "bunship-toast-action",
					cancelButton: "bunship-toast-cancel",
					closeButton: "bunship-toast-close",
					success: "bunship-toast-success",
					error: "bunship-toast-error",
					warning: "bunship-toast-warning",
					info: "bunship-toast-info",
					loading: "bunship-toast-loading",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
