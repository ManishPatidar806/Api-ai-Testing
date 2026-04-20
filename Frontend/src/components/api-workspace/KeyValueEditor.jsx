import Button from '../common/Button';
import InputField from '../common/InputField';

function KeyValueEditor({
  rows,
  onChange,
  onAdd,
  onRemove,
  disabled = false,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addButtonLabel = 'Add',
}) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
          <InputField
            placeholder={keyPlaceholder}
            value={row.key}
            disabled={disabled}
            onChange={(event) => onChange(index, 'key', event.target.value)}
          />
          <InputField
            placeholder={valuePlaceholder}
            value={row.value}
            disabled={disabled}
            onChange={(event) => onChange(index, 'value', event.target.value)}
          />
          <Button variant="secondary" className="h-fit md:mt-[2px]" onClick={() => onRemove(index)} disabled={disabled}>
            Remove
          </Button>
        </div>
      ))}
      <Button variant="secondary" onClick={onAdd} disabled={disabled}>
        {addButtonLabel}
      </Button>
    </div>
  );
}

export default KeyValueEditor;
