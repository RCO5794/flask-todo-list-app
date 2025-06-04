// --- DOM 元素選取 ---
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoDueDateInput = document.getElementById('todo-due-date');
const todoPriorityInput = document.getElementById('todo-priority');
const todoTagsInput = document.getElementById('todo-tags');
const todoList = document.getElementById('todo-list');
const clearFilterBtn = document.getElementById('clear-filter-btn');
const currentFilterInfo = document.getElementById('current-filter-info');
const sortOptionsSelect = document.getElementById('sort-options');

// --- 應用程式狀態 (State) ---
let todos = [];
const API_BASE_URL = 'http://127.0.0.1:5000/api';
let activeFilterTag = null;
let currentlyEditingId = null;
let currentSortCriteria = 'default';

// --- Toast 通知函式 (微調版) ---
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`; // 更簡潔的 classList 設定方式
    toast.textContent = message;

    document.body.appendChild(toast);

    // 為了讓 CSS transition 生效，我們需要讓瀏覽器先渲染元素，再添加 .show class
    requestAnimationFrame(() => { // 確保元素已在 DOM 中
        requestAnimationFrame(() => { // 再次請求動畫幀，確保 transition 能被觸發
             toast.classList.add('show');
        });
    });

    // 設定自動隱藏
    setTimeout(() => {
        toast.classList.remove('show');
        // 在 CSS transition 動畫結束後移除 DOM 元素
        // CSS transition 持續 0.3s (300ms)
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 350); // 給予略多於 transition duration 的時間確保動畫完成
    }, duration);
}


// --- 事件監聽器 ---
todoForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const todoText = todoInput.value.trim();
    if (todoText === '') { showToast('請輸入待辦事項！', 'error'); todoInput.focus(); return; }
    const todoDueDate = todoDueDateInput.value;
    const todoPriority = todoPriorityInput.value;
    const todoTagsRaw = todoTagsInput.value.trim();
    const tagsArray = todoTagsRaw === '' ? [] : todoTagsRaw.split(',')
                                                    .map(tag => tag.trim())
                                                    .filter(tag => tag !== '');
    const newTodoData = {
        text: todoText, dueDate: todoDueDate || null, priority: todoPriority,
        tags: tagsArray, completed: false
    };
    addTodoItem(newTodoData);
    todoInput.value = ''; todoDueDateInput.value = '';
    todoPriorityInput.value = 'medium'; todoTagsInput.value = '';
    todoInput.focus();
});

todoList.addEventListener('click', function(event) {
    const target = event.target.closest('button') || event.target; 
    const listItem = target.closest('li');
    if (!listItem) return;
    const todoId = parseInt(listItem.dataset.id);
    const todoItem = todos.find(t => t.id === todoId);

    if (listItem.classList.contains('editing') && 
        !target.classList.contains('save-edit-btn') && 
        !target.classList.contains('cancel-edit-btn')) {
        return;
    }
    if (target.classList.contains('complete-btn')) { if(todoItem) toggleTodoComplete(todoId); }
    else if (target.classList.contains('delete-btn')) { if(todoItem) deleteTodoItem(todoId); }
    else if (target.classList.contains('tag-item') && !listItem.classList.contains('editing')) {
        const tagToFilter = target.textContent; filterByTag(tagToFilter);
    } else if (target.classList.contains('edit-btn')) {
        if(todoItem) {
            if (currentlyEditingId && currentlyEditingId !== todoId) {
                const previousEditingLi = todoList.querySelector(`li[data-id="${currentlyEditingId}"].editing`);
                if (previousEditingLi) {
                    const previousTodoItem = todos.find(t => t.id === currentlyEditingId);
                    if(previousTodoItem) toggleEditMode(previousEditingLi, previousTodoItem, false);
                }
            }
            toggleEditMode(listItem, todoItem, true);
        }
    } else if (target.classList.contains('save-edit-btn')) { if(todoItem) saveEditedTodo(listItem, todoItem); }
    else if (target.classList.contains('cancel-edit-btn')) {
        if(todoItem) toggleEditMode(listItem, todoItem, false);
    }
});

clearFilterBtn.addEventListener('click', function() {
    activeFilterTag = null;
    if (currentlyEditingId) {
        const editingLi = todoList.querySelector(`li[data-id="${currentlyEditingId}"].editing`);
        if (editingLi) {
            const todoItem = todos.find(t => t.id === currentlyEditingId);
            if(todoItem) toggleEditMode(editingLi, todoItem, false);
        }
        currentlyEditingId = null;
    }
    renderTodos();
});

sortOptionsSelect.addEventListener('change', function(event) {
    currentSortCriteria = event.target.value;
    if (currentlyEditingId) {
        const editingLi = todoList.querySelector(`li[data-id="${currentlyEditingId}"].editing`);
        if (editingLi) {
            const todoItem = todos.find(t => t.id === currentlyEditingId);
            if(todoItem) toggleEditMode(editingLi, todoItem, false);
        }
        currentlyEditingId = null;
    }
    renderTodos();
});

// --- 核心 API 呼叫函式 ---
function addTodoItem(todoData) {
    fetch(`${API_BASE_URL}/todos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoData)
    }).then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        return response.json();
    }).then(createdTodo => {
        todos.unshift(createdTodo); 
        renderTodos();
        showToast('待辦事項已新增！', 'success');
    }).catch(error => {
        console.error('新增待辦事項失敗:', error);
        showToast(`新增失敗: ${error.message}`, 'error');
    });
}

function deleteTodoItem(id) {
    if (window.confirm("確定要刪除這個待辦事項嗎？")) {
        if (id === currentlyEditingId) {
            const editingLi = todoList.querySelector(`li[data-id="${currentlyEditingId}"].editing`);
            if (editingLi) {
                const todoItem = todos.find(t => t.id === currentlyEditingId);
                if(todoItem) toggleEditMode(editingLi, todoItem, false);
            }
            currentlyEditingId = null; 
        }
        fetch(`${API_BASE_URL}/todos/${id}`, { method: 'DELETE' })
        .then(response => {
            if (!response.ok) {
                 if (response.status === 404) throw new Error('找不到該事項 (404)');
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
            todos = todos.filter(todo => todo.id !== id); 
            renderTodos();
            showToast('待辦事項已刪除。', 'info');
        }).catch(error => {
            console.error(`刪除待辦事項 ${id} 失敗:`, error); 
            showToast(`刪除失敗: ${error.message}`, 'error');
        });
    } else { 
        console.log("刪除操作已取消。");
    }
}

function toggleTodoComplete(id) {
    fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
    }).then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        return response.json();
    }).then(updatedTodoFromServer => {
        const index = todos.findIndex(todo => todo.id === updatedTodoFromServer.id);
        if (index !== -1) { 
            todos[index] = updatedTodoFromServer; 
            showToast(updatedTodoFromServer.completed ? '事項已標記完成！' : '事項已取消完成。', 'success');
        }
        renderTodos();
    }).catch(error => {
        console.error(`更新待辦事項 ${id} 狀態失敗:`, error);
        showToast(`更新狀態失敗: ${error.message}`, 'error');
    });
}

// --- 編輯相關函式 ---
function toggleEditMode(listItem, todoItem, isEnteringEditMode) {
    const textContainer = listItem.querySelector('.text-container');
    const actionButtonsContainer = listItem.querySelector('.action-buttons-container');
    const editFormContainer = listItem.querySelector('.edit-form-container');
    if (!editFormContainer || !textContainer || !actionButtonsContainer) { console.error("CRITICAL: Required containers not found."); return; }

    if (isEnteringEditMode) {
        listItem.classList.add('editing'); currentlyEditingId = todoItem.id;
        textContainer.style.display = 'none'; actionButtonsContainer.style.display = 'none';
        editFormContainer.innerHTML = `
            <input type="text" class="edit-text" value="${escapeHTML(todoItem.text)}" required>
            <input type="date" class="edit-due-date" value="${todoItem.dueDate || ''}">
            <select class="edit-priority">
                <option value="high" ${todoItem.priority === 'high' ? 'selected' : ''}>高</option>
                <option value="medium" ${todoItem.priority === 'medium' ? 'selected' : ''}>一般</option>
                <option value="low" ${todoItem.priority === 'low' ? 'selected' : ''}>低</option>
            </select>
            <input type="text" class="edit-tags" value="${(todoItem.tags || []).map(tag => escapeHTML(tag)).join(', ')}" placeholder="標籤, 以逗號分隔">
            <div class="edit-action-buttons">
                <button class="save-edit-btn" title="儲存變更"><i class="fas fa-save"></i> 儲存</button>
                <button class="cancel-edit-btn" title="取消編輯"><i class="fas fa-times"></i> 取消</button>
            </div>
        `;
        editFormContainer.style.display = 'flex';
        const textInput = editFormContainer.querySelector('.edit-text');
        if (textInput) textInput.focus();
    } else {
        listItem.classList.remove('editing');
        if (currentlyEditingId === todoItem.id) { currentlyEditingId = null; }
        textContainer.style.display = 'flex'; actionButtonsContainer.style.display = 'flex';
        editFormContainer.style.display = 'none';
    }
}

function saveEditedTodo(listItem, todoItem) {
    const editFormContainer = listItem.querySelector('.edit-form-container');
    if (!editFormContainer) { console.error("Cannot save, edit form container not found."); return; }
    const newText = editFormContainer.querySelector('.edit-text').value.trim();
    const newDueDate = editFormContainer.querySelector('.edit-due-date').value;
    const newPriority = editFormContainer.querySelector('.edit-priority').value;
    const newTagsRaw = editFormContainer.querySelector('.edit-tags').value.trim();
    const newTagsArray = newTagsRaw === '' ? [] : newTagsRaw.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    if (!newText) { showToast('待辦事項文字不能為空！', 'error'); return; }

    const updatedTodoData = {
        text: newText, dueDate: newDueDate || null, priority: newPriority,
        tags: newTagsArray, completed: todoItem.completed
    };
    fetch(`${API_BASE_URL}/todos/${todoItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodoData)
    }).then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        return response.json();
    }).then(savedTodoFromServer => {
        const index = todos.findIndex(t => t.id === savedTodoFromServer.id);
        if (index !== -1) { todos[index] = savedTodoFromServer; }
        currentlyEditingId = null; 
        renderTodos();
        showToast('待辦事項已更新！', 'success');
    }).catch(error => {
        console.error(`儲存待辦事項 ${todoItem.id} 失敗:`, error); 
        showToast(`儲存失敗: ${error.message}`, 'error');
    });
}

// --- 渲染與篩選 ---
function renderTodos() {
    todoList.innerHTML = '';
    let todosToRender = [...todos];

    if (activeFilterTag) {
        todosToRender = todosToRender.filter(todo => todo.tags && todo.tags.includes(activeFilterTag));
        currentFilterInfo.textContent = `篩選中： #${activeFilterTag}`;
        clearFilterBtn.classList.remove('hidden');
    } else {
        currentFilterInfo.textContent = '';
        clearFilterBtn.classList.add('hidden');
    }

    const priorityOrder = { high: 1, medium: 2, low: 3 };
    if (currentSortCriteria === 'dueDateAsc') {
        todosToRender.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1;
            if (!b.dueDate) return -1; return new Date(a.dueDate) - new Date(b.dueDate);
        });
    } else if (currentSortCriteria === 'dueDateDesc') {
        todosToRender.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1;
            if (!b.dueDate) return -1; return new Date(b.dueDate) - new Date(a.dueDate);
        });
    } else if (currentSortCriteria === 'priority') {
        todosToRender.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
    }
    
    todosToRender.forEach(function(todo) {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', String(todo.id));
        listItem.className = '';
        if (todo.completed) { listItem.classList.add('completed'); }
        listItem.classList.add(`priority-${todo.priority}`);

        const textContainer = document.createElement('div');
        textContainer.classList.add('text-container');
        const textSpan = document.createElement('span');
        textSpan.textContent = escapeHTML(todo.text);
        textSpan.classList.add('todo-text');
        textContainer.appendChild(textSpan);
        const priorityTextSpan = document.createElement('span');
        priorityTextSpan.classList.add('priority-text');
        switch(todo.priority) {
            case 'high': priorityTextSpan.textContent = '優先級：高'; break;
            case 'low': priorityTextSpan.textContent = '優先級：低'; break;
        }
        if (priorityTextSpan.textContent) { textContainer.appendChild(priorityTextSpan); }
        if (todo.dueDate) {
            const dueDateSpan = document.createElement('span');
            dueDateSpan.textContent = `截止：${formatDate(todo.dueDate)}`;
            dueDateSpan.classList.add('due-date-text');
            textContainer.appendChild(dueDateSpan);
        }
        if (todo.tags && todo.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.classList.add('tags-container');
            todo.tags.forEach(function(tagText) {
                const tagSpan = document.createElement('span');
                tagSpan.textContent = escapeHTML(tagText);
                tagSpan.classList.add('tag-item');
                if (tagText === activeFilterTag) { tagSpan.classList.add('active-tag-filter'); }
                tagsContainer.appendChild(tagSpan);
            });
            textContainer.appendChild(tagsContainer);
        }
        listItem.appendChild(textContainer);

        const editFormContainer = document.createElement('div');
        editFormContainer.classList.add('edit-form-container');
        editFormContainer.style.display = 'none';
        listItem.appendChild(editFormContainer);

        const actionButtonsContainer = document.createElement('div');
        actionButtonsContainer.classList.add('action-buttons-container');
        const completeButton = document.createElement('button');
        completeButton.classList.add('complete-btn');
        completeButton.setAttribute('title', todo.completed ? '標記為未完成' : '標記為完成');
        completeButton.innerHTML = todo.completed ? '<i class="fas fa-undo-alt"></i>' : '<i class="fas fa-check"></i>';
        actionButtonsContainer.appendChild(completeButton);
        const editButton = document.createElement('button');
        editButton.classList.add('edit-btn');
        editButton.setAttribute('title', '編輯此事項');
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        actionButtonsContainer.appendChild(editButton);
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-btn');
        deleteButton.setAttribute('title', '刪除此事項');
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        actionButtonsContainer.appendChild(deleteButton);
        listItem.appendChild(actionButtonsContainer);

        if (currentlyEditingId === todo.id) {
            toggleEditMode(listItem, todo, true);
        }
        todoList.appendChild(listItem);
    });
}

// --- 輔助函式 ---
function filterByTag(tagText) {
    activeFilterTag = (activeFilterTag === tagText) ? null : tagText;
    if (currentlyEditingId) {
        const editingLi = todoList.querySelector(`li[data-id="${currentlyEditingId}"].editing`);
        if (editingLi) {
            const todoItem = todos.find(t => t.id === currentlyEditingId);
            if(todoItem) toggleEditMode(editingLi, todoItem, false);
        }
        currentlyEditingId = null;
    }
    renderTodos();
}
function formatDate(dateString) {
    if (!dateString) return ''; return dateString.replace(/-/g, '/');
}
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function (match) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
    });
}

// --- 初始化 ---
function fetchAndRenderTodos() {
    fetch(`${API_BASE_URL}/todos`)
    .then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        return response.json();
    }).then(data_from_api => {
        todos = data_from_api; renderTodos();
    }).catch(error => {
        console.error('無法從後端獲取待辦事項:', error);
        showToast(`無法載入待辦事項: ${error.message}`, 'error', 5000);
        todos = []; renderTodos();
    });
}
function initializeApp() {
    fetchAndRenderTodos();
    console.log('待辦事項應用程式已啟動！(Toast 通知已更新)');
}
initializeApp();