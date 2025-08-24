import React, { useState } from 'react';
import { WorkbookList } from './components/WorkbookList';
import { WorkbookForm } from './components/WorkbookForm';
import { WorkbookDetail } from './components/WorkbookDetail';
import { workbookApi, type Workbook, type WorkbookCreate, type WorkbookUpdate } from './services/workbookApi';
import './styles/common.css';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentWorkbook, setCurrentWorkbook] = useState<Workbook | null>(null);
  const [currentWorkbookId, setCurrentWorkbookId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateWorkbook = async (data: WorkbookCreate) => {
    try {
      await workbookApi.createWorkbook(data);
      alert('문제집이 성공적으로 생성되었습니다.');
      setViewMode('list');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert('문제집 생성에 실패했습니다.');
      console.error('Error creating workbook:', err);
    }
  };

  const handleUpdateWorkbook = async (data: WorkbookUpdate) => {
    if (!currentWorkbook) return;
    
    try {
      await workbookApi.updateWorkbook(currentWorkbook.id, data);
      alert('문제집이 성공적으로 수정되었습니다.');
      setViewMode('list');
      setCurrentWorkbook(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert('문제집 수정에 실패했습니다.');
      console.error('Error updating workbook:', err);
    }
  };

  const handleEditWorkbook = (workbook: Workbook) => {
    setCurrentWorkbook(workbook);
    setViewMode('edit');
  };

  const handleViewWorkbook = (id: number) => {
    setCurrentWorkbookId(id);
    setViewMode('detail');
  };

  const handleDeleteWorkbook = (id: number) => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setViewMode('list');
    setCurrentWorkbook(null);
    setCurrentWorkbookId(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <WorkbookForm
            mode="create"
            onSubmit={(data: WorkbookCreate) => handleCreateWorkbook(data)}
            onCancel={handleCancel}
          />
        );
      
      case 'edit':
        return (
          <WorkbookForm
            workbook={currentWorkbook || undefined}
            mode="edit"
            onSubmit={(data: WorkbookUpdate) => handleUpdateWorkbook(data)}
            onCancel={handleCancel}
          />
        );
      
      case 'detail':
        return (
          <WorkbookDetail
            workbookId={currentWorkbookId!}
            onBack={handleCancel}
          />
        );
      
      default:
        return (
          <WorkbookList
            onEdit={handleEditWorkbook}
            onDelete={handleDeleteWorkbook}
            onView={handleViewWorkbook}
            key={refreshTrigger}
          />
        );
    }
  };

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <h1>HGU OJ - 문제집</h1>
          {viewMode === 'list' && (
            <button
              className="btn btn-primary"
              onClick={() => setViewMode('create')}
            >
              새 문제집 만들기
            </button>
          )}
        </div>
      </header>
      
      <div className="container">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
