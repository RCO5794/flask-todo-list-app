document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素選取 ---
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoDueDateInput = document.getElementById('todo-due-date');
    const todoNotesInput = document.getElementById('todo-notes');
    const todoPriorityInput = document.getElementById('todo-priority');
    const todoTagsInput = document.getElementById('todo-tags');
    const todoList = document.getElementById('todo-list');
    const searchInput = document.getElementById('search-input');
    const themeCheckbox = document.getElementById('theme-checkbox');
    const userInfoDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');

    // --- 編輯視窗的 DOM 元素選取 ---
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editTodoIdInput = document.getElementById('edit-todo-id');
    const editTodoTextInput = document.getElementById('edit-todo-text');
    const editTodoDueDateInput = document.getElementById('edit-todo-due-date');
    const editTodoNotesInput = document.getElementById('edit-todo-notes');
    const editTodoPriorityInput = document.getElementById('edit-todo-priority');
    const editTodoTagsInput = document.getElementById('edit-todo-tags');

    const API_BASE_URL = '/api';
    let todos = [];

    // --- 主題模式 ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeCheckbox.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            themeCheckbox.checked = false;
        }
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // --- [修改] 核心渲染函式 ---
    function renderTodos(todoItems = todos, parentElement = todoList, isSubtask = false) {
        if (!isSubtask) parentElement.innerHTML = '';
        todoItems.forEach(todo => {
            const container = document.createElement('li');
            container.className = 'todo-item-container';
            container.dataset.id = todo.id;
            if (todo.completed) container.classList.add('completed');
            container.innerHTML = `
                <div class="todo-item">
                    <div class="priority-indicator priority-${todo.priority}"></div>
                    <div class="todo-content">
                        <div class="todo-main-info"><span class="todo-text">${escapeHTML(todo.text)}</span></div>
                        <div class="todo-meta-info">
                            ${todo.dueDate ? `<span class="due-date-text">截止: ${formatDateTime(todo.dueDate)}</span>` : ''}
                            <div class="tags-container">${todo.tags.map(tag => `<span class="tag-item">${escapeHTML(tag)}</span>`).join('')}</div>
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="add-subtask-btn" title="新增子任務"><i class="fas fa-plus-circle"></i></button>
                        <button class="complete-btn" title="完成/取消完成"><i class="fas ${todo.completed ? 'fa-undo-alt' : 'fa-check'}"></i></button>
                        <button class="edit-btn" title="編輯"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="刪除"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                ${todo.notes ? `<div class="notes-section">${escapeHTML(todo.notes)}</div>` : ''}
            `;
            parentElement.appendChild(container);
            if (todo.children && todo.children.length > 0) {
                const subtaskList = document.createElement('ul');
                subtaskList.className = 'subtask-list';
                container.appendChild(subtaskList);
                renderTodos(todo.children, subtaskList, true);
            }
        });
    }

    // --- API 呼叫 ---
    function fetchTodos() { fetch(`${API_BASE_URL}/todos`, { credentials: 'include' }).then(res => res.json()).then(data => { todos = data; renderTodos(); }); }
    function addTodoItem(todoData) { fetch(`${API_BASE_URL}/todos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(todoData) }).then(res => res.json()).then(() => fetchTodos()); }
    function updateTodoItem(id, updateData) { fetch(`${API_BASE_URL}/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(updateData) }).then(() => fetchTodos()); }
    function deleteTodoItem(id) { if (window.confirm("確定要刪除這個事項嗎？其下的所有子任務也會一併被刪除！")) { fetch(`${API_BASE_URL}/todos/${id}`, { method: 'DELETE', credentials: 'include' }).then(() => fetchTodos()); } }
    function fetchSearchResults(query) { if (!query) { fetchTodos(); return; } fetch(`${API_BASE_URL}/todos/search?q=${encodeURIComponent(query)}`, { credentials: 'include' }).then(res => res.json()).then(data => renderTodos(data)); }

    // --- [修改] 事件監聽器 ---
    todoList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const container = e.target.closest('.todo-item-container');
        const id = parseInt(container.dataset.id);
        if (button.classList.contains('complete-btn')) { updateTodoItem(id, { completed: !container.classList.contains('completed') }); }
        if (button.classList.contains('delete-btn')) { deleteTodoItem(id); }
        if (button.classList.contains('add-subtask-btn')) { const text = prompt('請輸入子任務內容：'); if (text && text.trim()) addTodoItem({ text: text.trim(), parent_id: id }); }
        
        // --- [移除] 切換備註的邏輯已不再需要 ---

        if (button.classList.contains('edit-btn')) {
            const todoToEdit = findTodoById(todos, id);
            if (todoToEdit) {
                editTodoIdInput.value = todoToEdit.id;
                editTodoTextInput.value = todoToEdit.text;
                editTodoDueDateInput.value = todoToEdit.dueDate ? formatForDateTimeLocal(todoToEdit.dueDate) : '';
                editTodoNotesInput.value = todoToEdit.notes || '';
                editTodoPriorityInput.value = todoToEdit.priority;
                editTodoTagsInput.value = todoToEdit.tags.join(', ');
                editModal.style.display = 'flex';
            }
        }
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(editTodoIdInput.value);
        const updatedData = {
            text: editTodoTextInput.value.trim(),
            dueDate: editTodoDueDateInput.value || null,
            notes: editTodoNotesInput.value.trim(),
            priority: editTodoPriorityInput.value,
            tags: editTodoTagsInput.value.trim() ? editTodoTagsInput.value.split(',').map(t => t.trim()) : []
        };
        if (!updatedData.text) { alert('內容為必填欄位！'); return; }
        updateTodoItem(id, updatedData);
        editModal.style.display = 'none';
    });

    cancelEditBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
    editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.style.display = 'none'; });
    themeCheckbox.addEventListener('change', () => { const theme = themeCheckbox.checked ? 'dark' : 'light'; localStorage.setItem('theme', theme); applyTheme(theme); });
    todoForm.addEventListener('submit', (e) => { e.preventDefault(); const newTodoData = { text: todoInput.value.trim(), dueDate: todoDueDateInput.value || null, notes: todoNotesInput.value.trim(), priority: todoPriorityInput.value, tags: todoTagsInput.value.trim() ? todoTagsInput.value.split(',').map(t => t.trim()) : [] }; if (!newTodoData.text) return; addTodoItem(newTodoData); todoForm.reset(); });
    if (logoutBtn) { logoutBtn.addEventListener('click', () => { fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' }).then(res => res.ok ? res.json() : Promise.reject('登出失敗')).then(() => { alert('已成功登出'); window.location.href = '/login'; }).catch(err => alert(err)); }); }
    searchInput.addEventListener('input', (e) => { fetchSearchResults(e.target.value); });

    // --- 輔助函式 ---
    function escapeHTML(str) { return str ? str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]) : ''; }
    function formatDateTime(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
    function findTodoById(nodes, id) { for (const node of nodes) { if (node.id === id) return node; if (node.children) { const found = findTodoById(node.children, id); if (found) return found; } } return null; }
    function formatForDateTimeLocal(isoString) { if (!isoString) return ''; const d = new Date(isoString); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

    // --- 初始化 ---
    function initializeApp() {
        fetch(`${API_BASE_URL}/check_session`, { credentials: 'include' })
            .then(res => { if (!res.ok) throw new Error('Not logged in'); return res.json(); })
            .then(data => { if (data.logged_in) { userInfoDisplay.textContent = `使用者：${data.username}`; fetchTodos(); } })
            .catch(() => { window.location.href = '/login'; });
    }

    initializeApp();
});