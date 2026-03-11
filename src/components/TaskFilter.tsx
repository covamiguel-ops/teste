import React from 'react';
import '../styles/TaskFilter.css';

interface TaskFilterProps {
  activeFilter: 'all' | 'active' | 'completed';
  onFilterChange: (filter: 'all' | 'active' | 'completed') => void;
  activeTasks: number;
  completedTasks: number;
  onClearCompleted: () => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({
  activeFilter,
  onFilterChange,
  activeTasks,
  completedTasks,
  onClearCompleted,
}) => {
  return (
    <div className="task-filter">
      <div className="filter-buttons">
        <button
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          Todas ({activeTasks + completedTasks})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
          onClick={() => onFilterChange('active')}
        >
          Ativas ({activeTasks})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
          onClick={() => onFilterChange('completed')}
        >
          Concluídas ({completedTasks})
        </button>
      </div>

      {completedTasks > 0 && (
        <button className="btn btn-secondary" onClick={onClearCompleted}>
          Limpar Concluídas
        </button>
      )}
    </div>
  );
};