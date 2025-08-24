import React, { useState, useEffect } from 'react';
import { workbookApi, type Workbook, type WorkbookCreate, type WorkbookUpdate } from '../services/workbookApi';

interface WorkbookFormProps {
  workbook?: Workbook;
  onSubmit: (data: WorkbookCreate | WorkbookUpdate) => void | Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

export const WorkbookForm: React.FC<WorkbookFormProps> = ({ 
  workbook, 
  onSubmit, 
  onCancel, 
  mode 
}) => {
  const [formData, setFormData] = useState<WorkbookCreate | WorkbookUpdate>({
    title: '',
    description: ''
  });

  useEffect(() => {
    if (workbook && mode === 'edit') {
      setFormData({
        title: workbook.title,
        description: workbook.description || ''
      });
    }
  }, [workbook, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="workbook-form-container">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {mode === 'create' ? '새 문제집 만들기' : '문제집 수정'}
          </h3>
        </div>
        <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              제목 *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-control"
              value={formData.title || ''}
              onChange={handleChange}
              placeholder="문제집 제목을 입력하세요"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              설명
            </label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="문제집에 대한 설명을 입력하세요"
              rows={4}
            />
          </div>

          <div className="d-flex justify-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {mode === 'create' ? '생성' : '수정'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
