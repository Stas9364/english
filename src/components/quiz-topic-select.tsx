import { Label } from "@/components/ui/label";

interface QuizTopicSelectProps {
  value: string;
  onChange: (value: string) => void;
  topics: { id: string; name: string }[];
  isLoading?: boolean;
  error?: string | null;
}

export function QuizTopicSelect({
  value,
  onChange,
  topics,
  isLoading,
  error,
}: QuizTopicSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="topic_id">Topic</Label>
      <select
        id="topic_id"
        className="cursor-pointer h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:scheme-dark"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      >
        <option value="" disabled>
          {isLoading ? "Loading topics..." : "Select topic"}
        </option>
        {topics.map((topic) => (
          <option key={topic.id} value={topic.id}>
            {topic.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
