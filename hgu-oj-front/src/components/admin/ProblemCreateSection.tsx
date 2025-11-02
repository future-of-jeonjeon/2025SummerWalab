import React, { useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { RichTextEditor } from '../molecules/RichTextEditor';
import { adminService, CreateProblemPayload } from '../../services/adminService';
import {
  availableLanguages,
  getLanguageBackendValue,
  getLanguageLabel,
  normalizeLanguageKey,
  toBackendLanguageList,
  templateMap,
} from '../../lib/problemLanguage';

type ProblemFormState = {
  displayId: string;
  title: string;
  description: string;
  inputDescription: string;
  outputDescription: string;
  difficulty: 'High' | 'Mid' | 'Low';
  timeLimit: string;
  memoryLimit: string;
  ruleType: 'ACM' | 'OI';
  tags: string;
  visible: boolean;
  shareSubmission: boolean;
  source: string;
  hint: string;
  ioInput: string;
  ioOutput: string;
};

const initialProblemForm: ProblemFormState = {
  displayId: '',
  title: '',
  description: '',
  inputDescription: '',
  outputDescription: '',
  difficulty: 'Mid',
  timeLimit: '1000',
  memoryLimit: '256',
  ruleType: 'ACM',
  tags: '',
  visible: true,
  shareSubmission: false,
  source: '',
  hint: '',
  ioInput: 'input.txt',
  ioOutput: 'output.txt',
};

export const ProblemCreateSection: React.FC = () => {
  const [problemForm, setProblemForm] = useState<ProblemFormState>(initialProblemForm);
  const [samples, setSamples] = useState<Array<{ input: string; output: string }>>([
    { input: '', output: '' },
  ]);
  const [problemLanguages, setProblemLanguages] = useState<string[]>([...availableLanguages]);
  const [testCaseFile, setTestCaseFile] = useState<File | null>(null);
  const [testCaseId, setTestCaseId] = useState('');
  const [isUploadingTestCases, setIsUploadingTestCases] = useState(false);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemMessage, setProblemMessage] = useState<{ success?: string; error?: string }>({});

  const handleSampleChange = (index: number, field: 'input' | 'output', value: string) => {
    setSamples((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddSample = () => {
    setSamples((prev) => [...prev, { input: '', output: '' }]);
  };

  const handleRemoveSample = (index: number) => {
    setSamples((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleLanguage = (language: string) => {
    const normalized = normalizeLanguageKey(language);
    if (!normalized) {
      return;
    }
    setProblemLanguages((prev) => {
      const current = new Set(prev);
      if (current.has(normalized)) {
        current.delete(normalized);
      } else {
        current.add(normalized);
      }
      const ordered = availableLanguages.filter((lang) => current.has(lang));
      return ordered;
    });
  };

  const handleUploadTestCases = async () => {
    if (!testCaseFile) {
      setProblemMessage({ error: '업로드할 테스트케이스 ZIP 파일을 선택하세요.' });
      return;
    }
    try {
      setIsUploadingTestCases(true);
      setProblemMessage({});
      const result = await adminService.uploadProblemTestCases(testCaseFile, false);
      setTestCaseId(result.id);
      setProblemMessage({ success: `테스트케이스 업로드 완료 (ID: ${result.id})` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '테스트케이스 업로드 중 오류가 발생했습니다.';
      setProblemMessage({ error: message });
    } finally {
      setIsUploadingTestCases(false);
    }
  };

  const handleProblemSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblemMessage({});

    if (!problemForm.displayId.trim()) {
      setProblemMessage({ error: '표시 ID를 입력하세요.' });
      return;
    }

    if (!testCaseId) {
      setProblemMessage({ error: '먼저 테스트케이스를 업로드해 ID를 확보하세요.' });
      return;
    }

    const cleanedSamples = samples
      .map((sample) => ({ input: sample.input.trim(), output: sample.output.trim() }))
      .filter((sample) => sample.input || sample.output);

    if (cleanedSamples.length === 0) {
      setProblemMessage({ error: '최소 한 개 이상의 예제를 입력하세요.' });
      return;
    }

    const tagList = problemForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (tagList.length === 0) {
      setProblemMessage({ error: '태그를 최소 한 개 이상 입력하세요.' });
      return;
    }

    if (problemLanguages.length === 0) {
      setProblemMessage({ error: '최소 한 개 이상의 언어를 선택하세요.' });
      return;
    }

    const backendLanguages = toBackendLanguageList(problemLanguages);

    const payload: CreateProblemPayload = {
      _id: problemForm.displayId.trim(),
      title: problemForm.title.trim(),
      description: problemForm.description,
      input_description: problemForm.inputDescription,
      output_description: problemForm.outputDescription,
      samples: cleanedSamples,
      test_case_id: testCaseId,
      test_case_score: [] as Array<{ input_name: string; output_name: string; score: number }>,
      time_limit: Number(problemForm.timeLimit) || 1000,
      memory_limit: Number(problemForm.memoryLimit) || 256,
      languages: backendLanguages,
      template: problemLanguages.reduce<Record<string, string>>((acc, lang) => {
        const backendKey = getLanguageBackendValue(lang);
        acc[backendKey] = templateMap[lang] || '';
        return acc;
      }, {}),
      rule_type: problemForm.ruleType,
      io_mode: {
        io_mode: 'Standard IO',
        input: problemForm.ioInput.trim() || 'input.txt',
        output: problemForm.ioOutput.trim() || 'output.txt',
      },
      spj: false,
      spj_language: null,
      spj_code: null,
      spj_compile_ok: false,
      visible: problemForm.visible,
      difficulty: problemForm.difficulty,
      tags: tagList,
      hint: problemForm.hint.trim() || null,
      source: problemForm.source.trim() || null,
      share_submission: problemForm.shareSubmission,
    };

    try {
      setProblemLoading(true);
      await adminService.createProblem(payload);
      setProblemMessage({ success: '문제가 성공적으로 등록되었습니다.' });
      setProblemForm(initialProblemForm);
      setSamples([{ input: '', output: '' }]);
      setProblemLanguages([...availableLanguages]);
      setTestCaseFile(null);
      setTestCaseId('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 등록 중 오류가 발생했습니다.';
      setProblemMessage({ error: message });
    } finally {
      setProblemLoading(false);
    }
  };

  return (
    <Card padding="lg">
      <form onSubmit={handleProblemSubmit} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">문제 등록</h2>
          <p className="text-sm text-gray-500">ZIP 테스트케이스 업로드 후 메타데이터를 입력하세요. SPJ는 현재 지원하지 않습니다.</p>
        </div>

        {problemMessage.error && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{problemMessage.error}</div>
        )}
        {problemMessage.success && (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{problemMessage.success}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="표시 ID"
            value={problemForm.displayId}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, displayId: e.target.value }))}
            required
          />
          <Input
            label="제목"
            value={problemForm.title}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <Input
            label="시간 제한 (ms)"
            type="number"
            value={problemForm.timeLimit}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, timeLimit: e.target.value }))}
          />
          <Input
            label="메모리 제한 (MB)"
            type="number"
            value={problemForm.memoryLimit}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, memoryLimit: e.target.value }))}
          />
          <Input
            label="태그 (쉼표로 구분)"
            value={problemForm.tags}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="dp, greedy"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
              value={problemForm.difficulty}
              onChange={(e) => setProblemForm((prev) => ({ ...prev, difficulty: e.target.value as ProblemFormState['difficulty'] }))}
            >
              <option value="Low">Level1</option>
              <option value="Mid">Level2</option>
              <option value="High">Level3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">룰 타입</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
              value={problemForm.ruleType}
              onChange={(e) => setProblemForm((prev) => ({ ...prev, ruleType: e.target.value as ProblemFormState['ruleType'] }))}
            >
              <option value="ACM">ACM</option>
              <option value="OI">OI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공개/풀이 공유</label>
            <div className="flex items-center space-x-3">
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={problemForm.visible}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, visible: e.target.checked }))}
                />
                <span>공개</span>
              </label>
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={problemForm.shareSubmission}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, shareSubmission: e.target.checked }))}
                />
                <span>풀이 공유 허용</span>
              </label>
            </div>
          </div>
          <Input
            label="출처"
            value={problemForm.source}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, source: e.target.value }))}
          />
          <Input
            label="힌트"
            value={problemForm.hint}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, hint: e.target.value }))}
          />
          <Input
            label="입력 파일명"
            value={problemForm.ioInput}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, ioInput: e.target.value }))}
          />
          <Input
            label="출력 파일명"
            value={problemForm.ioOutput}
            onChange={(e) => setProblemForm((prev) => ({ ...prev, ioOutput: e.target.value }))}
          />
        </div>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">문제 설명</h3>
            <p className="text-xs text-gray-500">문제 본문 및 입출력 설명을 작성하세요.</p>
          </div>
          <RichTextEditor
            label="문제 설명"
            value={problemForm.description}
            onChange={(value) => setProblemForm((prev) => ({ ...prev, description: value }))}
          />
          <RichTextEditor
            label="입력 설명"
            value={problemForm.inputDescription}
            onChange={(value) => setProblemForm((prev) => ({ ...prev, inputDescription: value }))}
          />
          <RichTextEditor
            label="출력 설명"
            value={problemForm.outputDescription}
            onChange={(value) => setProblemForm((prev) => ({ ...prev, outputDescription: value }))}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">예제 입출력</h3>
              <p className="text-xs text-gray-500">예제 입력과 출력을 최소 1개 이상 입력하세요.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddSample}>
              예제 추가
            </Button>
          </div>
          <div className="space-y-4">
            {samples.map((sample, index) => (
              <div key={`sample-${index}`} className="border rounded-lg p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">예제 입력 #{index + 1}</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                      rows={3}
                      value={sample.input}
                      onChange={(e) => handleSampleChange(index, 'input', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">예제 출력 #{index + 1}</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                      rows={3}
                      value={sample.output}
                      onChange={(e) => handleSampleChange(index, 'output', e.target.value)}
                    />
                  </div>
                  {samples.length > 1 && (
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => handleRemoveSample(index)}>
                        예제 삭제
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">지원 언어</h3>
          <div className="flex flex-wrap gap-3">
            {availableLanguages.map((language) => (
              <label
                key={language}
                className="inline-flex items-center space-x-2 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={problemLanguages.includes(language)}
                  onChange={() => toggleLanguage(language)}
                />
                <span>{getLanguageLabel(language)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">테스트케이스 업로드</h3>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <input
              type="file"
              accept=".zip"
              onChange={(event) => setTestCaseFile(event.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <Button type="button" variant="outline" loading={isUploadingTestCases} onClick={handleUploadTestCases}>
              테스트케이스 업로드
            </Button>
            {testCaseId && <span className="text-sm text-green-600">현재 ID: {testCaseId}</span>}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={problemLoading}>문제 등록</Button>
        </div>
      </form>
    </Card>
  );
};

export default ProblemCreateSection;

