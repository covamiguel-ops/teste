import React, { useState, useEffect } from 'react';
import { Task } from './types/Task';
import { taskService } from './services/taskService';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskFilter } from './components/TaskFilter';
import './styles/App.css';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const loadedTasks = taskService.getAllTasks();
    setTasks(loadedTasks);
  }, []);

  const handleAddTask = (title: string, description: string, priority: 'low' | 'medium' | 'high', dueDate?: string) => {
    const newTask = taskService.createTask(title, description, priority, dueDate);
    setTasks([...tasks, newTask]);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    const updatedTask = taskService.updateTask(id, updates);
    if (updatedTask) {
      setTasks(tasks.map(task => task.id === id ? updatedTask : task));
      setEditingTask(null);
    }
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta tarefa?')) {
      const success = taskService.deleteTask(id);
      if (success) {
        setTasks(tasks.filter(task => task.id !== id));
      }
    }
  };

  const handleToggleTask = (id: string) => {
    const updatedTask = taskService.toggleTask(id);
    if (updatedTask) {
      setTasks(tasks.map(task => task.id === id ? updatedTask : task));
    }
  };

  const handleClearCompleted = () => {
    if (window.confirm('Tem certeza que deseja deletar todas as tarefas concluídas?')) {
      taskService.deleteAllCompleted();
      setTasks(tasks.filter(task => !task.completed));
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  // Filter tasks based on current filter
  const filteredTasks = taskService.getTasksByFilter(filter);
  const activeTasks = tasks.filter(task => !task.completed).length;
  const completedTasks = tasks.filter(task => task.completed).length;

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Gestão de Tarefas</h1>
        <p>Organize suas tarefas e aumente sua produtividade</p>
      </header>

      <main className="app-main">
        <div className="container">
          {editingTask ? (
            <div className="edit-section">
              <TaskForm
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                initialTask={editingTask}
                isEditing={true}
              />
              <button className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancelar Edição
              </button>
            </div>
          ) : (
            <TaskForm onAddTask={handleAddTask} />
          )}

          <TaskFilter
            activeFilter={filter}
            onFilterChange={setFilter}
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            onClearCompleted={handleClearCompleted}
          />

          <TaskList
            tasks={filteredTasks}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
            onEdit={handleEditTask}
            filter={filter}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2026 Gestão de Tarefas. Desenvolvido com React e TypeScript.</p>
      </footer>
    </div>
  );
}

export default App;