"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type FormSubmitButtonProps = ComponentProps<typeof Button> & {
  pendingLabel?: ReactNode;
};

export function FormSubmitButton({
  children,
  disabled,
  pendingLabel = "Procesando...",
  type = "submit",
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
