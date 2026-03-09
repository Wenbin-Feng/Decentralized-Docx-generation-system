interface TokenInputProps {
  label: string;
  token: string;
  value: string;
  onChange: (value: string) => void;
  balance?: string;
  readOnly?: boolean;
}

export default function TokenInput({
  label,
  token,
  value,
  onChange,
  balance,
  readOnly = false,
}: TokenInputProps) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>{label}</span>
        {balance && (
          <span
            className="cursor-pointer hover:text-white"
            onClick={() => !readOnly && onChange(balance)}
          >
            余额: {balance}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          placeholder="0.0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={`bg-transparent text-2xl text-white outline-none flex-1 min-w-0 ${
            readOnly ? "cursor-default" : ""
          }`}
        />
        <span className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap">
          {token}
        </span>
      </div>
    </div>
  );
}
