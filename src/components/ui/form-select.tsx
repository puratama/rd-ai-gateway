"use client";

import { useId } from "react";
import Select, { type GroupBase, type StylesConfig } from "react-select";

export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

const selectStyles: StylesConfig<SelectOption, boolean> = {
  control: (base, { isFocused, isDisabled }) => ({
    ...base,
    minHeight: 36,
    backgroundColor: "var(--color-background)",
    borderColor: isFocused ? "var(--color-ring)" : "var(--color-input)",
    boxShadow: "none",
    borderRadius: "0.5rem",
    cursor: isDisabled ? "not-allowed" : "text",
    opacity: isDisabled ? 0.5 : 1,
    "&:hover": { borderColor: "var(--color-ring)" },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--color-popover)",
    color: "var(--color-popover-foreground)",
    borderRadius: "0.5rem",
    overflow: "hidden",
    zIndex: 60,
  }),
  menuList: (base) => ({ ...base, maxHeight: 208, padding: "0.25rem" }),
  groupHeading: (base) => ({
    ...base,
    color: "var(--color-muted-foreground)",
    fontSize: "0.6875rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "0.375rem 0.5rem 0.125rem",
  }),
  option: (base, { isSelected, isFocused, isDisabled }) => ({
    ...base,
    backgroundColor: isDisabled
      ? "transparent"
      : isSelected
        ? "var(--color-primary)"
        : isFocused
          ? "var(--color-accent)"
          : "transparent",
    color: isDisabled
      ? "var(--color-muted-foreground)"
      : isSelected
        ? "var(--color-primary-foreground)"
        : "var(--color-popover-foreground)",
    borderRadius: "0.375rem",
    cursor: isDisabled ? "not-allowed" : "pointer",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "var(--color-muted)",
    borderRadius: "0.375rem",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--color-foreground)",
    fontSize: "0.8125rem",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "var(--color-muted-foreground)",
    "&:hover": {
      backgroundColor: "var(--color-destructive)",
      color: "var(--color-destructive-foreground)",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--color-muted-foreground)",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--color-foreground)",
  }),
  input: (base) => ({ ...base, color: "var(--color-foreground)" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "var(--color-muted-foreground)",
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--color-muted-foreground)",
  }),
};

interface CommonProps {
  options: SelectOption[] | (GroupBase<SelectOption> & { options: SelectOption[] })[];
  placeholder?: string;
  isClearable?: boolean;
  isSearchable?: boolean;
  noOptionsMessage?: string;
  disabled?: boolean;
  className?: string;
}

interface SingleProps extends CommonProps {
  isMulti?: false;
  value: SelectOption | null;
  onChange: (value: string | null) => void;
}

interface MultiProps extends CommonProps {
  isMulti: true;
  value: SelectOption[];
  onChange: (value: string[]) => void;
}

export type FormSelectProps = SingleProps | MultiProps;

export function FormSelect(props: FormSelectProps) {
  // react-select generates instanceId from a module-level counter, which is
  // unstable across SSR vs client hydration. Pin it with a stable React id.
  const instanceId = useId();
  const common = {
    options: props.options,
    placeholder: props.placeholder ?? "Pilih...",
    isClearable: props.isClearable ?? true,
    isSearchable: props.isSearchable ?? true,
    isDisabled: props.disabled,
    noOptionsMessage: () => props.noOptionsMessage ?? "Tidak ada data",
    styles: selectStyles,
    className: props.className,
    instanceId,
  };

  if (props.isMulti) {
    return (
      <Select
        {...common}
        isMulti
        value={props.value}
        onChange={(vals) => props.onChange((vals ?? []).map((v) => v.value))}
      />
    );
  }

  return (
    <Select
      {...common}
      value={props.value}
      onChange={(v) => props.onChange(v ? (v as SelectOption).value : null)}
    />
  );
}
