import sqlite3
import json
from flask import Flask, jsonify, request, session, redirect, url_for, g, render_template
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import functools

DATABASE = 'todos.db'

app = Flask(__name__)
app.secret_key = 'a_very_secret_and_secure_key_change_me' 
CORS(app, supports_credentials=True)

# --- 資料庫連線管理 (無變動) ---
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- 資料庫初始化 (重大修改) ---
def init_db():
    db = get_db()
    cursor = db.cursor()
    # 使用者資料表 (無變動)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    # --- 修改 todos 資料表，新增 notes 和 parent_id ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            dueDate TEXT,
            priority TEXT DEFAULT 'medium',
            tags TEXT,
            notes TEXT,                     -- 新增：備註欄位
            parent_id INTEGER,              -- 新增：子任務關聯
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (parent_id) REFERENCES todos (id) ON DELETE CASCADE -- 父任務刪除時，子任務也一併刪除
        )
    ''')
    # 新增索引以優化查詢
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id)')
    
    # 預設使用者 (無變動)
    cursor.execute('SELECT id FROM users WHERE username = ?', ('andy',))
    if cursor.fetchone() is None:
        hashed_password = generate_password_hash('1234')
        cursor.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', ('andy', hashed_password))
        print("預設使用者 'andy' 已建立。")
    db.commit()
    print("資料庫已初始化 (todos 表已更新)")

# --- 裝飾器與網頁路由 (無變動) ---
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'): return jsonify({"error": "Authorization required"}), 401
            return redirect(url_for('login_page'))
        g.user_id = session['user_id']
        g.username = session['username']
        return view(**kwargs)
    return wrapped_view

@app.route('/')
def root():
    if 'user_id' in session: return redirect(url_for('main_app_page'))
    return redirect(url_for('login_page'))

@app.route('/login')
def login_page(): return render_template('login.html')

@app.route('/register')
def register_page(): return render_template('register.html')

@app.route('/app')
@login_required
def main_app_page(): return render_template('index.html')


# --- API 端點 (大規模更新) ---

# ... (註冊, 登入, 登出, 檢查 session 的 API 無變動) ...
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password: return jsonify({"error": "錯誤：帳號和密碼為必填欄位。"}), 400
    if len(password) < 4: return jsonify({"error": "錯誤：密碼長度至少需要 4 個字元。"}), 400
    db = get_db()
    if db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone():
        return jsonify({"error": f"使用者名稱 '{username}' 已被註冊，請更換一個。"}), 409
    hashed_password = generate_password_hash(password)
    db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, hashed_password))
    db.commit()
    return jsonify({"success": True, "message": "註冊成功！"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password: return jsonify({"error": "請輸入帳號和密碼"}), 400
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if user and check_password_hash(user['password_hash'], password):
        session.clear()
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({"success": True, "username": user['username']})
    return jsonify({"error": "帳號或密碼錯誤"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "已成功登出"})

@app.route('/api/check_session', methods=['GET'])
@login_required
def check_session(): return jsonify({"logged_in": True, "username": g.username})


# --- 全新的搜尋 API ---
@app.route('/api/todos/search', methods=['GET'])
@login_required
def search_todos():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
        
    db = get_db()
    search_term = f'%{query}%'
    # 搜尋 text, notes, tags 欄位
    results = db.execute(
        "SELECT * FROM todos WHERE user_id = ? AND (text LIKE ? OR notes LIKE ? OR tags LIKE ?) ORDER BY id DESC",
        (g.user_id, search_term, search_term, search_term)
    ).fetchall()
    
    # 搜尋結果直接以扁平列表回傳
    todos_list = [dict(row) for row in results]
    for item in todos_list:
        item['completed'] = bool(item['completed'])
        item['tags'] = json.loads(item['tags']) if item['tags'] else []
    
    return jsonify(todos_list)


@app.route('/api/todos', methods=['GET'])
@login_required
def get_todos_from_db():
    db = get_db()
    # 一次性讀取該使用者的所有事項
    all_todos_flat = db.execute(
        'SELECT * FROM todos WHERE user_id = ? ORDER BY id DESC', (g.user_id,)
    ).fetchall()

    # --- 將扁平列表轉換為巢狀樹狀結構 ---
    todos_map = {todo['id']: dict(todo) for todo in all_todos_flat}
    nested_todos = []

    for todo_id, todo in todos_map.items():
        # 處理布林值和 JSON 欄位
        todo['completed'] = bool(todo['completed'])
        todo['tags'] = json.loads(todo['tags']) if todo['tags'] else []
        todo.setdefault('children', []) # 確保每個節點都有 children 屬性
        
        parent_id = todo.get('parent_id')
        if parent_id and parent_id in todos_map:
            # 如果有父節點，將自己加入父節點的 children 列表
            todos_map[parent_id].setdefault('children', []).append(todo)
        else:
            # 如果沒有父節點，是根節點
            nested_todos.append(todo)

    return jsonify(nested_todos)

@app.route('/api/todos', methods=['POST'])
@login_required
def add_todo_to_db():
    data = request.json
    if not data or not data.get('text', '').strip():
        return jsonify({"error": "Missing or empty text"}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO todos (text, completed, dueDate, priority, tags, notes, parent_id, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['text'].strip(),
        1 if data.get('completed', False) else 0,
        data.get('dueDate'),
        data.get('priority', 'medium'),
        json.dumps(data.get('tags', [])),
        data.get('notes', ''), # 儲存備註
        data.get('parent_id'), # 儲存父任務 ID
        g.user_id
    ))
    db.commit()
    new_id = cursor.lastrowid
    
    # 回傳新建立的 todo 項目
    new_todo = db.execute('SELECT * FROM todos WHERE id = ?', (new_id,)).fetchone()
    new_todo_dict = dict(new_todo)
    new_todo_dict['completed'] = bool(new_todo_dict['completed'])
    new_todo_dict['tags'] = json.loads(new_todo_dict['tags']) if new_todo_dict['tags'] else []
    new_todo_dict['children'] = []
    
    return jsonify(new_todo_dict), 201

@app.route('/api/todos/<int:id>', methods=['PUT'])
@login_required
def update_todo_in_db(id):
    db = get_db()
    # 確認這個 todo 屬於目前使用者
    if not db.execute('SELECT id FROM todos WHERE id = ? AND user_id = ?', (id, g.user_id)).fetchone():
        return jsonify({"error": "Todo not found or not authorized"}), 404
    
    data = request.get_json(silent=True) or {}
    fields_to_update = {}
    
    # 處理欄位更新
    allowed_fields = ['text', 'completed', 'dueDate', 'priority', 'tags', 'notes']
    for field in allowed_fields:
        if field in data:
            value = data[field]
            if field == 'text': value = value.strip()
            if field == 'completed': value = 1 if value else 0
            if field == 'tags': value = json.dumps(value)
            fields_to_update[field] = value

    if not fields_to_update:
        return jsonify({"error": "No valid fields to update"}), 400

    set_clauses = [f"{field} = ?" for field in fields_to_update.keys()]
    values = tuple(fields_to_update.values()) + (id,)
    
    db.execute(f"UPDATE todos SET {', '.join(set_clauses)} WHERE id = ?", values)
    db.commit()

    # 回傳更新後的完整項目
    updated_todo = db.execute('SELECT * FROM todos WHERE id = ?', (id,)).fetchone()
    updated_todo_dict = dict(updated_todo)
    updated_todo_dict['completed'] = bool(updated_todo_dict['completed'])
    updated_todo_dict['tags'] = json.loads(updated_todo_dict['tags']) if updated_todo_dict['tags'] else []
    
    return jsonify(updated_todo_dict)

@app.route('/api/todos/<int:id>', methods=['DELETE'])
@login_required
def delete_todo_from_db(id):
    db = get_db()
    # 注意：因為我們在資料表設定了 ON DELETE CASCADE，
    # 所以刪除父任務時，SQLite 會自動刪除所有子任務。
    # 我們只需要確保使用者有權限刪除這個 (可能是父) 任務即可。
    result = db.execute('DELETE FROM todos WHERE id = ? AND user_id = ?', (id, g.user_id))
    db.commit()
    
    if result.rowcount == 0:
        return jsonify({"error": "Todo not found or not authorized"}), 404
        
    return '', 204

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)