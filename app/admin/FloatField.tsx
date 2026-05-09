"use client";

import { forwardRef, useId, useState } from "react";
import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type CommonProps = {
  label: string;
  icon?: string;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
};

type InputProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
    as?: "input";
    rows?: never;
  };

type TextareaProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> & {
    as: "textarea";
    type?: never;
  };

type FloatFieldProps = InputProps | TextareaProps;

const FloatField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FloatFieldProps>(
  function FloatField(props, ref) {
    const reactId = useId();
    const id = props.id ?? `ff-${reactId}`;
    const isTextarea = props.as === "textarea";

    const [showPassword, setShowPassword] = useState(false);
    const isPassword = !isTextarea && props.type === "password";

    const containerClass = [
      "admin-float-field",
      props.icon ? "admin-float-field-icon" : "",
      isPassword ? "admin-float-field-toggle" : "",
      isTextarea ? "admin-float-field-textarea" : "",
      props.containerClassName ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    const sharedClass =
      "admin-input admin-float-input" +
      (isTextarea ? " admin-textarea" : "");

    const {
      label,
      icon,
      hint,
      error,
      containerClassName: _ignored,
      ...rest
    } = props as CommonProps & Record<string, unknown>;

    return (
      <div className={containerClass}>
        {isTextarea ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            placeholder=" "
            className={sharedClass}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={id}
            placeholder=" "
            className={sharedClass}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            type={
              isPassword
                ? showPassword
                  ? "text"
                  : "password"
                : (rest as InputHTMLAttributes<HTMLInputElement>).type ?? "text"
            }
          />
        )}

        <label className="admin-float-label" htmlFor={id}>
          {label}
        </label>

        {icon && (
          <i
            className={`${
              /\bfa-(solid|regular|brands|light|thin|duotone|sharp)\b/.test(icon)
                ? icon
                : `fa-solid ${icon}`
            } admin-float-icon`}
            aria-hidden="true"
          />
        )}

        {isPassword && (
          <button
            type="button"
            className="admin-float-toggle"
            onClick={() => setShowPassword((s) => !s)}
            disabled={(rest as InputHTMLAttributes<HTMLInputElement>).disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            title={showPassword ? "Hide password" : "Show password"}
          >
            <i
              className={`fa-solid ${showPassword ? "fa-lock-open" : "fa-lock"}`}
              aria-hidden="true"
            />
          </button>
        )}

        {error ? (
          <p className="admin-float-error" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="admin-float-hint">{hint}</p>
        ) : null}
      </div>
    );
  }
);

export default FloatField;

export type { FloatFieldProps };

// Convenience helper for simple controlled-input usage.
export function useFloatFieldChange<T extends string | number>(
  setter: (v: T) => void,
  parser: (raw: string) => T = ((v: string) => v) as (raw: string) => T
) {
  return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setter(parser(e.target.value));
}
