"use client";

import { useState } from "react";
import Select from "@/components/Select";

// Drop-in replacement for `<select name=... defaultValue=...>` inside a form,
// renders the styled Select component and a hidden input that carries the
// chosen value to the server action. Optional `onChange` lets the caller
// react to value changes (e.g. for live filter bars).
export default function StyledSelectField({
  name,
  options,
  defaultValue,
  ariaLabel,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  ariaLabel?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function handleChange(next: string) {
    setValue(next);
    if (onChange) onChange(next);
  }

  return (
    <>
      <Select value={value} onChange={handleChange} options={options} ariaLabel={ariaLabel} />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
