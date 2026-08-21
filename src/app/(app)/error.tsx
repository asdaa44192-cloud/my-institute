"use client";

import { redactIfLooksLikeDatabaseError } from "@/lib/utils";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-10 text-center">
      <p className="text-sm font-medium text-red-800">Something went wrong</p>
      <p className="text-sm text-red-600">{redactIfLooksLikeDatabaseError(error.message)}</p>
      <button
        onClick={reset}
        className="mt-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
