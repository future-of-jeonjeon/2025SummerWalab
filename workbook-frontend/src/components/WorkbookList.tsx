import React, { useState, useEffect } from 'react';
import { workbookApi, type Workbook } from '../services/workbookApi';

interface WorkbookListProps {
  onEdit: (workbook: Workbook) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
}

type SortType = 'created_at' | 'title';
type SortOrder = 'asc' | 'desc';

export const WorkbookList: React.FC<WorkbookListProps> = ({ onEdit, onDelete, onView }) => {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // localStorage에서 정렬 상태 복원
  const [sortType, setSortType] = useState<SortType>(() => {
    const saved = localStorage.getItem('workbook-sort-type');
    return (saved as SortType) || 'created_at';
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem('workbook-sort-order');
    return (saved as SortOrder) || 'desc';
  });

  useEffect(() => {
    loadWorkbooks();
  }, []);

  // 정렬 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('workbook-sort-type', sortType);
    localStorage.setItem('workbook-sort-order', sortOrder);
  }, [sortType, sortOrder]);

  const loadWorkbooks = async () => {
    try {
      setLoading(true);
      const data = await workbookApi.getWorkbooks();
      setWorkbooks(data);
      setError(null);
    } catch (err) {
      setError('문제집 목록을 불러오는데 실패했습니다.');
      console.error('Error loading workbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (type: SortType) => {
    if (sortType === type) {
      // 같은 정렬 기준이면 순서만 변경
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 정렬 기준이면 해당 기준으로 설정하고 기본값은 내림차순
      setSortType(type);
      setSortOrder('desc');
    }
  };

  const getSortedWorkbooks = () => {
    return [...workbooks].sort((a, b) => {
      let comparison = 0;
      
      if (sortType === 'created_at') {
        // 날짜 정렬 개선: ISO 문자열을 Date 객체로 변환하여 비교
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        
        // 유효하지 않은 날짜 처리
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
          comparison = 0;
        } else if (isNaN(dateA.getTime())) {
          comparison = -1; // 유효하지 않은 날짜는 뒤로
        } else if (isNaN(dateB.getTime())) {
          comparison = 1; // 유효하지 않은 날짜는 뒤로
        } else {
          comparison = dateA.getTime() - dateB.getTime();
        }
      } else if (sortType === 'title') {
        // 한글 정렬 개선: 숫자와 한글을 구분하여 정렬
        const titleA = a.title || '';
        const titleB = b.title || '';
        
        // 빈 제목 처리
        if (!titleA && !titleB) {
          comparison = 0;
        } else if (!titleA) {
          comparison = -1; // 빈 제목은 뒤로
        } else if (!titleB) {
          comparison = 1; // 빈 제목은 뒤로
        } else {
          // 한글, 영문, 숫자 순으로 정렬 우선순위 설정
          comparison = titleA.localeCompare(titleB, 'ko-KR', {
            numeric: true, // 숫자를 숫자로 인식하여 정렬
            sensitivity: 'base' // 대소문자 구분 없이 정렬
          });
        }
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const getSortIcon = (type: SortType) => {
    if (sortType !== type) return '⇅';
    return sortOrder === 'asc' ? '⇧' : '⇩';
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('정말로 이 문제집을 삭제하시겠습니까?')) {
      try {
        await workbookApi.deleteWorkbook(id);
        setWorkbooks(workbooks.filter(w => w.id !== id));
      } catch (err) {
        alert('문제집 삭제에 실패했습니다.');
        console.error('Error deleting workbook:', err);
      }
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

  if (error) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <p style={{ color: '#ed4014' }}>{error}</p>
          <button className="btn btn-primary" onClick={loadWorkbooks}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (workbooks.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <p>등록된 문제집이 없습니다.</p>
        </div>
      </div>
    );
  }

  const sortedWorkbooks = getSortedWorkbooks();

  return (
    <div className="workbook-list-full">
      <div className="list-header">
        <h3 className="list-title">문제집 목록</h3>
        <div className="sort-options">
          <button
            className={`sort-btn ${sortType === 'created_at' ? 'active' : ''}`}
            onClick={() => handleSort('created_at')}
          >
            생성일순 {getSortIcon('created_at')}
          </button>
          <button
            className={`sort-btn ${sortType === 'title' ? 'active' : ''}`}
            onClick={() => handleSort('title')}
          >
            제목순 {getSortIcon('title')}
          </button>
        </div>
      </div>
      <div className="list-content">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>제목</th>
              <th>설명</th>
              <th>생성일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {sortedWorkbooks.map((workbook) => (
              <tr key={workbook.id}>
                <td>{workbook.id}</td>
                <td>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      onView(workbook.id);
                    }}
                    style={{ color: '#2d8cf0', textDecoration: 'none' }}
                  >
                    {workbook.title}
                  </a>
                </td>
                <td>{workbook.description || '-'}</td>
                <td>{new Date(workbook.created_at).toLocaleDateString('ko-KR')}</td>
                <td>
                  <div className="d-flex">
                    <button
                      className="btn btn-primary"
                      onClick={() => onView(workbook.id)}
                      style={{ marginRight: '8px' }}
                    >
                      보기
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => onEdit(workbook)}
                      style={{ marginRight: '8px' }}
                    >
                      수정
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(workbook.id)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
