export const CorrectAnswers = ({ correctTextByGap }: { correctTextByGap: string[][] }) => {
    return (<div className="text-sm text-muted-foreground">
      <p className="mb-1">Correct answers:</p>
      <ul className="list-disc pl-5 space-y-0.5">
        {correctTextByGap.map((texts, i) => (
          <li key={`correct-input-gap-${i}`}>
            #{i + 1}: {texts.join(" / ") || "—"}
          </li>
        ))}
      </ul>
    </div>)
  }