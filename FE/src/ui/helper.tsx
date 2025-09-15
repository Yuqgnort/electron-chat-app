import { Check, CheckCheck, ChevronRight, RefreshCcw } from "lucide-react";

export const getStatusIcon = (
  status: string,
  defaultProperty = { width: 12, height: 12 }
) => {
  switch (status) {
    case "sent":
      return <ChevronRight {...defaultProperty} />;
    case "delivered":
      return <Check {...defaultProperty} />;
    case "read":
      return <CheckCheck {...defaultProperty} />;
    default:
      return <RefreshCcw {...defaultProperty} />;
  }
};
