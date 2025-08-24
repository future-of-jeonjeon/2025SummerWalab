import React, { useState, useEffect } from 'react';
import { workbookApi, type Workbook, type WorkbookProblem, type Problem } from '../services/workbookApi';

interface WorkbookDetailProps {
  workbookId: number;
  onBack: () => void;
}

export const WorkbookDetail: React.FC<WorkbookDetailProps> = ({ workbookId, onBack }) => {
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [problems, setProblems] = useState<WorkbookProblem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditProblems, setShowEditProblems] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadWorkbookDetail();
  }, [workbookId]);

  const loadWorkbookDetail = async () => {
    try {
      setLoading(true);
      const [workbookData, problemsData] = await Promise.all([
        workbookApi.getWorkbook(workbookId),
        workbookApi.getWorkbookProblems(workbookId)
      ]);
      setWorkbook(workbookData);
      setProblems(problemsData);
      
      // 현재 문제집에 포함된 문제들의 ID를 선택된 상태로 설정
      const currentProblemIds = new Set(problemsData.map(p => p.problem_id));
      setSelectedProblems(currentProblemIds);
      
      setError(null);
    } catch (err) {
      setError('문제집 정보를 불러오는데 실패했습니다.');
      console.error('Error loading workbook detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllProblems = async () => {
    try {
      const problemsData = await workbookApi.getAllProblems();
      setAllProblems(problemsData);
    } catch (err) {
      console.error('Error loading all problems:', err);
      alert('모든 문제 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleEditProblems = async () => {
    if (!showEditProblems) {
      // 문제 수정 모드 진입 시 모든 문제 목록 로드
      await loadAllProblems();
    }
    setShowEditProblems(!showEditProblems);
  };

  const handleProblemToggle = (problemId: number) => {
    setSelectedProblems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      return newSet;
    });
  };

  const handleSaveProblems = async () => {
    try {
      const selectedProblemIds = Array.from(selectedProblems);
      await workbookApi.updateWorkbookProblems(workbookId, selectedProblemIds);
      
      // 문제집 문제 목록 새로고침
      await loadWorkbookDetail();
      setShowEditProblems(false);
      alert('문제가 성공적으로 업데이트되었습니다.');
    } catch (err) {
      alert('문제 업데이트에 실패했습니다.');
      console.error('Error updating problems:', err);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !workbook) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <p style={{ color: '#ed4014' }}>{error || '문제집을 찾을 수 없습니다.'}</p>
          <button className="btn btn-primary" onClick={onBack}>
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 문제집 정보 */}
      <div className="card mb-20">
        <div className="card-header">
          <h3 className="card-title">문제집 상세 정보</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">제목</label>
            <p className="form-control" style={{ backgroundColor: '#f8f9fa', border: 'none' }}>
              {workbook.title}
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">설명</label>
            <p className="form-control" style={{ backgroundColor: '#f8f9fa', border: 'none' }}>
              {workbook.description || '설명이 없습니다.'}
            </p>
          </div>
          {workbook.category && (
            <div className="form-group">
              <label className="form-label">카테고리</label>
              <p className="form-control" style={{ backgroundColor: '#f8f9fa', border: 'none' }}>
                {workbook.category}
              </p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">공개 여부</label>
            <p className="form-control" style={{ backgroundColor: '#f8f9fa', border: 'none' }}>
              {workbook.is_public ? '공개' : '비공개'}
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">생성일</label>
            <p className="form-control" style={{ backgroundColor: '#f8f9fa', border: 'none' }}>
              {new Date(workbook.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onBack}>
            목록으로 돌아가기
          </button>
        </div>
      </div>

      {/* 문제 목록 */}
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-between align-center">
            <h3 className="card-title">포함된 문제들</h3>
            <button
              className="btn btn-primary"
              onClick={handleEditProblems}
            >
              {showEditProblems ? '취소' : '문제 수정'}
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* 문제 수정 모드 */}
          {showEditProblems && (
            <div className="card mb-20" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="card-body">
                <div className="d-flex justify-between align-center mb-20">
                  <h4>문제 추가/제거</h4>
                  <button className="btn btn-success" onClick={handleSaveProblems}>
                    저장
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>문제 ID</th>
                        <th>문제 제목</th>
                        <th>문제 설명</th>
                        <th style={{ textAlign: 'center' }}>선택</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProblems.map((problem) => (
                        <tr key={problem.id}>
                          <td>{problem.id}</td>
                          <td>{problem.title}</td>
                          <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {problem.description}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedProblems.has(problem.id)}
                              onChange={() => handleProblemToggle(problem.id)}
                              style={{ transform: 'scale(1.2)' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 문제 목록 테이블 */}
          {problems.length === 0 ? (
            <p className="text-center">아직 추가된 문제가 없습니다.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>순서</th>
                  <th>문제 ID</th>
                  <th>문제 제목</th>
                  <th>상세보기</th>
                </tr>
              </thead>
              <tbody>
                {problems
                  .sort((a, b) => new Date(a.added_time).getTime() - new Date(b.added_time).getTime())
                  .map((problem, index) => (
                    <tr key={problem.id}>
                      <td>{index + 1}</td>
                      <td>{problem.problem_id}</td>
                      <td>
                        <span style={{ fontWeight: '500' }}>
                          문제 {problem.problem_id}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => window.open(`/problem/${problem.problem_id}`, '_blank')}
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
