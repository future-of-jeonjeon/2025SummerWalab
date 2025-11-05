import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '../../atoms/Input';
import { Button } from '../../atoms/Button';

export type OrganizationFormValues = {
  name: string;
  description?: string;
};

interface OrganizationFormProps {
  initialValues?: OrganizationFormValues;
  onSubmit: (values: OrganizationFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  loading?: boolean;
  errorMessage?: string | null;
}

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

export const OrganizationForm: React.FC<OrganizationFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = '저장',
  loading = false,
  errorMessage,
}) => {
  const derivedInitial = useMemo<OrganizationFormValues>(() => ({
    name: initialValues?.name ?? '',
    description: initialValues?.description ?? '',
  }), [initialValues]);

  const [formValues, setFormValues] = useState<OrganizationFormValues>(derivedInitial);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFormValues(derivedInitial);
  }, [derivedInitial]);

  const updateField = (key: keyof OrganizationFormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateField('name', event.target.value);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateField('description', event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = formValues.name.trim();
    if (!name) {
      setLocalError('조직 이름을 입력해주세요.');
      return;
    }
    if (name.length < NAME_MIN_LENGTH) {
      setLocalError(`조직 이름은 최소 ${NAME_MIN_LENGTH}자 이상 입력해주세요.`);
      return;
    }
    if (name.length > NAME_MAX_LENGTH) {
      setLocalError(`조직 이름은 ${NAME_MAX_LENGTH}자 이내로 입력해주세요.`);
      return;
    }
    const descriptionValue = formValues.description?.trim() ?? '';
    if (descriptionValue.length > DESCRIPTION_MAX_LENGTH) {
      setLocalError(`조직 설명은 ${DESCRIPTION_MAX_LENGTH}자 이내로 입력해주세요.`);
      return;
    }
    setLocalError(null);
    await onSubmit({
      name,
      description: descriptionValue.length > 0 ? descriptionValue : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="조직 이름"
        placeholder="조직 이름을 입력하세요"
        value={formValues.name}
        maxLength={NAME_MAX_LENGTH}
        onChange={handleNameChange}
        required
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          조직 설명
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
          placeholder="조직에 대한 간단한 설명을 입력하세요"
          value={formValues.description ?? ''}
          maxLength={DESCRIPTION_MAX_LENGTH}
          onChange={handleDescriptionChange}
          rows={4}
        />
      </div>

      {(localError || errorMessage) && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {localError || errorMessage}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            취소
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
