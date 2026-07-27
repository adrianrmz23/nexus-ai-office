"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick"
> & {
  confirmationMessage: string;
  pendingLabel?: string;
};

export function ConfirmSubmitButton({
  confirmationMessage,
  pendingLabel = "Procesando...",
  children,
  disabled,
  ...props
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
