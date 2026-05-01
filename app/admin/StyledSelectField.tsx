"use client";

import { useState } from "react";
import Select from "@/components/Select";

// Drop-in replacement for `<select name=... defaultValue=...>` inside a form,
// renders the styled Select component and a hidden input that carries the
// chosen value to the server action.
export default function StyledSelectField({
  name,
  options,
  defaultValue,
  ariaLabel,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <Select value={value} onChange={setValue} options={options} ariaLabel={ariaLabel} />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
