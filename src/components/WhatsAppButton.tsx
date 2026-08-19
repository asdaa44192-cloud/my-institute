import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  compact = false,
}: {
  phone: string;
  message: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={whatsappLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-emerald-600 font-medium text-white transition-colors hover:bg-emerald-700",
        compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"
      )}
    >
      <span aria-hidden>💬</span>
      {label}
    </a>
  );
}
