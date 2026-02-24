import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/atoms/Button';
import { WorkbookProblemList } from '../components/organisms/WorkbookProblemList';
import { useWorkbook, useWorkbookProblems } from '../hooks/useWorkbooks';
import { Problem } from '../types';
import { problemService } from '../services/problemService';
import { resolveProblemStatus } from '../utils/problemStatus';
import { PROBLEM_STATUS_LABELS, ProblemStatusKey, isProblemStatusKey } from '../constants/problemStatus';

export const WorkbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workbookId = id ? parseInt(id, 10) : 0;

  const { data: workbook, isLoading: workbookLoading, error: workbookError } = useWorkbook(workbookId);
  const { data: problemsData, isLoading: problemsLoading, error: problemsError } = useWorkbookProblems(workbookId);
  const [statusFilter, setStatusFilter] = useState<'all' | ProblemStatusKey>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all'); // Added for dropdown

  const getProblemExternalId = useCallback((problem: Problem | undefined): string | undefined => {
    if (!problem) return undefined;
    const candidates = [
      (problem as any)._id ?? problem._id,
      problem.displayId,
      problem.id,
    ];
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const key = String(candidate).trim();
      if (key.length > 0) {
        return key;
      }
    }
    return undefined;
  }, []);

  const handleProblemClick = (problemKey: string) => {
    const params = new URLSearchParams();
    params.set('workbookId', String(workbookId));
    if (!problemKey) return;
    navigate(`/problems/${encodeURIComponent(problemKey)}?${params.toString()}`);
  };

  const handleBackClick = () => {
    navigate('/workbooks');
  };

  const formatDateWithDots = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return '';
    return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
  };

  const problems = problemsData?.data || [];

  const normalizedProblems: Problem[] = useMemo(() => {
    return problems
      .map((item) => item.problem)
      .filter((problem): problem is Problem => Boolean(problem));
  }, [problems]);

  const problemIdentifiers = useMemo(
    () => normalizedProblems
      .map((problem) => getProblemExternalId(problem))
      .filter((value): value is string => Boolean(value)),
    [normalizedProblems],
  );

  const problemIdKey = problemIdentifiers.join('-');

  const { data: statusMap, isLoading: statusLoading } = useQuery(
    {
      queryKey: ['problem-status-map', problemIdKey],
      queryFn: () => problemService.getProblemStatusMap(problemIdentifiers),
      enabled: problemIdentifiers.length > 0,
    },
  );

  const enrichedProblems = useMemo(() => {
    if (!statusMap) return normalizedProblems;
    return normalizedProblems.map((problem) => {
      const key = getProblemExternalId(problem);
      const override = key ? statusMap[key] : undefined;
      if (!override) return problem;
      const overrideAny = override as any;
      return {
        ...problem,
        myStatus: override.myStatus ?? overrideAny.my_status ?? problem.myStatus,
        solved: override.solved ?? overrideAny.solved ?? problem.solved,
        submissionNumber: override.submissionNumber ?? overrideAny.submission_number ?? problem.submissionNumber,
        acceptedNumber: override.acceptedNumber ?? overrideAny.accepted_number ?? problem.acceptedNumber,
      };
    });
  }, [getProblemExternalId, normalizedProblems, statusMap]);

  const processedProblems = useMemo(() => {
    const matchesStatusFilter = (problem: Problem) => {
      const status = resolveProblemStatus(problem);
      if (statusFilter === 'all') return true;
      return status === statusFilter;
    };

    const matchesDifficultyFilter = (problem: Problem) => {
      if (difficultyFilter === 'all') return true;
      const rawDifficulty =
        (problem as any).difficulty ??
        (problem as any).level ??
        (problem as any).difficulty_level ??
        (problem as any).difficultyLevel ??
        (problem as any).difficulty_name ??
        (problem as any).difficultyName;
      if (!rawDifficulty) return false;
      const displayDifficulty = String(rawDifficulty).replace(/^Lv\.\s*/i, '');
      const level = Number(displayDifficulty);
      if (Number.isNaN(level)) return false;

      if (difficultyFilter === 'easy') return level === 1;
      if (difficultyFilter === 'medium') return level === 2 || level === 3;
      if (difficultyFilter === 'hard') return level >= 4;
      return true;
    };

    const filtered = enrichedProblems
      .filter(matchesStatusFilter)
      .filter(matchesDifficultyFilter);

    // Keep original ordering for now (which usually is problem order in the workbook)
    return filtered;
  }, [enrichedProblems, statusFilter, difficultyFilter]);

  const totalProblemCount = workbook?.problemCount ?? problems.length;

  const solvedCount = useMemo(() => {
    return enrichedProblems.filter(p => resolveProblemStatus(p) === 'solved').length;
  }, [enrichedProblems]);

  const progressPercentage = totalProblemCount > 0 ? Math.round((solvedCount / totalProblemCount) * 100) : 0;

  if (workbookLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (workbookError || !workbook) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">
          문제집을 찾을 수 없습니다.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          className="h-9 w-9 rounded-full border-slate-300 px-0 py-0 text-lg text-slate-600 hover:bg-slate-100"
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only">문제집 목록으로 돌아가기</span>
        </Button>
      </div>
    );
  }

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'all') {
      setStatusFilter('all');
    } else if (isProblemStatusKey(value)) {
      setStatusFilter(value);
    }
  };

  const handleDifficultyFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDifficultyFilter(event.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Navigation Breadcrumb */}
        <nav className="flex text-sm text-gray-500">
          <span className="cursor-pointer hover:text-gray-900" onClick={() => navigate('/workbooks')}>Workbooks</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium truncate">{workbook.title}</span>
        </nav>

        {/* 1. Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden relative">
          <div className="p-8 sm:p-10">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-extrabold tracking-wide uppercase rounded-full">
                OFFICIAL
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                {workbook.category || '기본 커리큘럼'}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 lg:gap-16">
              <div className="max-w-3xl flex-1">
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                  {workbook.title}
                </h1>

                {/* Description */}
                <div className="text-[15px] text-gray-600 mb-6 leading-relaxed max-w-2xl">
                  {workbook.description ? (
                    <div dangerouslySetInnerHTML={{ __html: workbook.description }} />
                  ) : (
                    <p>이 문제집에 대한 설명이 없습니다.</p>
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-6 text-sm text-gray-500 font-medium mb-4 lg:mb-0">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    최종 업데이트: {formatDateWithDots(workbook.updated_at || workbook.created_at)}
                  </div>
                </div>
              </div>

              {/* Progress Bar Area - Right side */}
              <div className="w-full lg:w-[350px] flex-shrink-0">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-[13px] font-medium text-gray-500">전체 진행률</div>
                  <div className="text-3xl font-extrabold text-blue-600 leading-none">{progressPercentage}%</div>
                </div>
                <div className="text-[15px] font-bold text-gray-900 mb-3">
                  {solvedCount} / {totalProblemCount} 문제 완료
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Problem List Header & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8 mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.5v-2.5a1.5 1.5 0 00-1.5-1.5h-2a1.5 1.5 0 00-1.5 1.5V18H6a2 2 0 01-2-2V4z" /></svg>
            문제 목록
          </h2>

          <div className="flex items-center gap-2.5">
            <select
              value={difficultyFilter}
              onChange={handleDifficultyFilterChange}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer shadow-sm min-w-[120px]"
            >
              <option value="all">모든 난이도</option>
              <option value="easy">Easy (Lv 1)</option>
              <option value="medium">Medium (Lv 2-3)</option>
              <option value="hard">Hard (Lv 4+)</option>
            </select>

            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer shadow-sm min-w-[120px]"
            >
              <option value="all">해결 상태</option>
              <option value="solved">{PROBLEM_STATUS_LABELS.solved}</option>
              <option value="wrong">{PROBLEM_STATUS_LABELS.wrong}</option>
              <option value="untouched">{PROBLEM_STATUS_LABELS.untouched}</option>
            </select>
          </div>
        </div>

        {/* 3. Problem List Component */}
        {problemsLoading || statusLoading ? (
          <div className="flex h-32 items-center justify-center bg-white rounded-xl border border-gray-200">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : problemsError ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <div className="text-red-500 font-medium mb-2">문제 목록을 불러오는 중 오류가 발생했습니다.</div>
            <p className="text-sm text-gray-500">{getErrorMessage(problemsError)}</p>
          </div>
        ) : (
          <WorkbookProblemList
            problems={processedProblems}
            onProblemClick={handleProblemClick}
          />
        )}

      </div>
    </div>
  );
};
