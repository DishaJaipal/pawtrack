import { useState } from "react";

type Unit = "years" | "months";

// Stores age as total months everywhere (backend field is ageMonths), but
// lets the person enter it in whichever unit makes sense for a young pet.
export function AgeInput({
  ageMonths,
  onChange,
}: {
  ageMonths: string;
  onChange: (months: string) => void;
}) {
  const initial = ageMonths ? Number(ageMonths) : null;
  const [unit, setUnit] = useState<Unit>(initial !== null && initial > 0 && initial % 12 === 0 ? "years" : "months");
  const [amount, setAmount] = useState<string>(
    initial === null ? "" : unit === "years" ? String(initial / 12) : String(initial)
  );

  function emit(nextAmount: string, nextUnit: Unit) {
    if (!nextAmount) {
      onChange("");
      return;
    }
    const n = Number(nextAmount);
    onChange(String(nextUnit === "years" ? Math.round(n * 12) : Math.round(n)));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-label-md text-label-md text-on-surface-variant">Age</span>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          className="min-h-[48px] min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none focus:border-secondary"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            emit(e.target.value, unit);
          }}
        />
        <select
          className="min-h-[48px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none focus:border-secondary"
          value={unit}
          onChange={(e) => {
            const u = e.target.value as Unit;
            setUnit(u);
            emit(amount, u);
          }}
        >
          <option value="years">Years</option>
          <option value="months">Months</option>
        </select>
      </div>
    </div>
  );
}
