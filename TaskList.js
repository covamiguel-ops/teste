// TaskList component that displays filtered tasks with empty state handling

import React from 'react';

const TaskList = ({ tasks }) => {
    if (tasks.length === 0) {
        return <div>No tasks available</div>;
    }

    return (
        <ul>
            {tasks.map((task) => (
                <li key={task.id}>{task.name}</li>
            ))}
        </ul>
    );
};

export default TaskList;