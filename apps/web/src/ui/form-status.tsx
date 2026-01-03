"use client";

export type FormState = {
  ok?: boolean;
  message?: string | null;
  error?: string | null;
};

export default function FormStatus({ state }: { state: FormState }) {
  if (state?.error) {
    return <div className="notice error">{state.error}</div>;
  }
  if (state?.message) {
    return <div className="notice success">{state.message}</div>;
  }
  return null;
}
