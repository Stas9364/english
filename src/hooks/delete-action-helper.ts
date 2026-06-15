import { toast } from "sonner";

export interface DeleteActionResult {
  ok: boolean;
  error?: string;
}

interface RunDeleteActionParams {
  id?: string;
  action: (id: string) => Promise<DeleteActionResult>;
  setResult: (result: DeleteActionResult) => void;
  errorTitle: string;
  successTitle: string;
}

export async function runDeleteAction({
  id,
  action,
  setResult,
  errorTitle,
  successTitle,
}: RunDeleteActionParams): Promise<boolean> {
  if (id) {
    const result = await action(id);
    if (!result.ok) {
      setResult(result);
      toast.error(errorTitle, {
        description: result.error ?? "Please try again.",
      });
      return false;
    }
  }

  toast.success(successTitle);
  return true;
}
