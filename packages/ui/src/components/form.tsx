"use client";

import { Label } from "@bunship-ai/ui/components/label";
import { cn } from "@bunship-ai/ui/lib/utils";
import type * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
	useFormState,
} from "react-hook-form";

const Form = FormProvider;

type FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
	{} as FormFieldContextValue,
);

const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState } = useFormContext();
	const formState = useFormState({ name: fieldContext.name });
	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
};

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				data-slot="form-item"
				className={cn("relative grid gap-2", className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

function FormLabel({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	const { error, formItemId } = useFormField();

	return (
		<Label
			data-slot="form-label"
			data-error={!!error}
			className={cn("data-[error=true]:text-destructive-foreground", className)}
			htmlFor={formItemId}
			{...props}
		/>
	);
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();

	return (
		<Slot
			data-slot="form-control"
			id={formItemId}
			aria-describedby={
				!error
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			{...props}
		/>
	);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function FormMessage({
	className,
	ref,
	isTooltip,
	...props
}: React.ComponentProps<"p"> & { isTooltip?: boolean }) {
	const { error, formMessageId } = useFormField();
	let body = error ? String(error?.message ?? "") : props.children;
	if (body === undefined || body === "undefined") {
		body = "";
	}
	if (typeof error === "object") {
		// biome-ignore lint/complexity/noForEach: <explanation>
		Object.keys(error).forEach((key) => {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			if ((error as any)?.[key]?.message) {
				if (typeof body === "string" && body?.length) {
					body += "\n";
				}
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				body += `${(error as any)?.[key]?.message}`;
			}
		});
	}
	if (!body) {
		return null;
	}

	if (isTooltip) {
		return (
			<div
				ref={ref}
				id={formMessageId}
				className={cn("absolute top-full left-0 z-50 mt-1", className)}
				{...props}
			>
				<div className="relative rounded-md border border-gray-200 bg-white px-3 py-2 font-medium text-destructive text-sm shadow-lg">
					<div className="absolute -top-2 left-4 h-4 w-4 rotate-45 border-gray-200 border-t border-l bg-white" />
					<span
						className={cn(
							"relative z-10 inline-block",
							`${body?.toString()?.length > 12 ? "w-[150px]" : "w-full"}`,
						)}
					>
						{body}
					</span>
				</div>
			</div>
		);
	}

	return (
		<p
			data-slot="form-message"
			id={formMessageId}
			className={cn("text-destructive-foreground text-sm", className)}
			{...props}
		>
			{body}
		</p>
	);
}

export {
	useFormField,
	Form,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
	FormField,
};
