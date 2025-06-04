import sqlite3
import json
from flask import Flask, jsonify, request
from flask_cors import CORS

DATABASE = 'todos.db'

app = Flask(__name__)
CORS(app)

# --- 資料庫輔助函式 ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            dueDate TEXT,
            priority TEXT DEFAULT 'medium',
            tags TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print("資料庫已初始化 (如果需要的話，已建立 todos 資料表)")

# --- API 端點 (Endpoints) ---
@app.route('/api/todos', methods=['GET'])
def get_todos_from_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM todos ORDER BY id DESC')
    todos_from_db = cursor.fetchall()
    conn.close()
    todos_list = []
    for row in todos_from_db:
        todo_item = dict(row)
        todo_item['completed'] = bool(todo_item['completed'])
        if todo_item['tags']:
            try: todo_item['tags'] = json.loads(todo_item['tags'])
            except json.JSONDecodeError: todo_item['tags'] = []
        else: todo_item['tags'] = []
        todos_list.append(todo_item)
    return jsonify(todos_list)

@app.route('/api/todos', methods=['POST'])
def add_todo_to_db():
    if not request.json or 'text' not in request.json or not request.json['text'].strip():
        return jsonify({"error": "Missing or empty text in request body"}), 400
    new_todo_data = request.json
    text = new_todo_data['text'].strip()
    completed_int = 1 if new_todo_data.get('completed', False) else 0
    due_date = new_todo_data.get('dueDate')
    priority = new_todo_data.get('priority', 'medium')
    tags_list = new_todo_data.get('tags', [])
    tags_json_string = json.dumps(tags_list)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO todos (text, completed, dueDate, priority, tags)
            VALUES (?, ?, ?, ?, ?)
        ''', (text, completed_int, due_date, priority, tags_json_string))
        conn.commit()
        new_id = cursor.lastrowid
    except sqlite3.Error as e:
        conn.rollback(); print(f"資料庫錯誤： {e}")
        return jsonify({"error": "Database operation failed"}), 500
    finally: conn.close()
    created_todo = {
        "id": new_id, "text": text, "completed": bool(completed_int),
        "dueDate": due_date, "priority": priority, "tags": tags_list
    }
    print(f"POST /api/todos，新增事項到資料庫：{created_todo}")
    return jsonify(created_todo), 201

@app.route('/api/todos/<int:id>', methods=['PUT'])
def update_todo_in_db(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM todos WHERE id = ?', (id,))
    current_todo_row = cursor.fetchone()
    if current_todo_row is None:
        conn.close(); return jsonify({"error": "Todo not found"}), 404

    updated_data_from_request = request.get_json(silent=True)
    fields_to_update = {}
    if not updated_data_from_request: # Body is empty or not JSON, assume simple toggle for 'completed'
        new_completed_int = 1 if current_todo_row['completed'] == 0 else 0
        fields_to_update = {'completed': new_completed_int}
        print(f"PUT /api/todos/{id} (toggle complete)，body 為空，切換 completed。")
    else:
        if 'text' in updated_data_from_request:
            new_text = updated_data_from_request['text'].strip()
            if not new_text: conn.close(); return jsonify({"error": "Text field cannot be empty"}), 400
            fields_to_update['text'] = new_text
        if 'completed' in updated_data_from_request:
            fields_to_update['completed'] = 1 if updated_data_from_request['completed'] else 0
        if 'dueDate' in updated_data_from_request:
            fields_to_update['dueDate'] = updated_data_from_request['dueDate'] if updated_data_from_request['dueDate'] else None
        if 'priority' in updated_data_from_request:
            fields_to_update['priority'] = updated_data_from_request['priority']
        if 'tags' in updated_data_from_request:
            if isinstance(updated_data_from_request['tags'], list):
                fields_to_update['tags'] = json.dumps(updated_data_from_request['tags'])
            else: conn.close(); return jsonify({"error": "Tags must be an array"}), 400
        if not fields_to_update:
            conn.close(); return jsonify({"error": "No valid fields to update provided in request body"}), 400
        print(f"PUT /api/todos/{id} (edit)，body 有內容，準備更新欄位: {list(fields_to_update.keys())}")

    set_clauses = [f"{field} = ?" for field in fields_to_update.keys()]
    values_to_update = list(fields_to_update.values())
    values_to_update.append(id)
    sql_update_query = f"UPDATE todos SET {', '.join(set_clauses)} WHERE id = ?"
    try:
        cursor.execute(sql_update_query, tuple(values_to_update))
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        print(f"更新事項 {id} 時資料庫錯誤：{e}, Query: {sql_update_query}, Values: {tuple(values_to_update)}")
        return jsonify({"error": "Database operation failed during update"}), 500
    
    cursor.execute('SELECT * FROM todos WHERE id = ?', (id,))
    updated_todo_row_from_db = cursor.fetchone()
    conn.close()
    if updated_todo_row_from_db is None: return jsonify({"error": "Failed to retrieve updated todo after update"}), 500
    updated_todo_item_for_response = dict(updated_todo_row_from_db)
    updated_todo_item_for_response['completed'] = bool(updated_todo_item_for_response['completed'])
    if updated_todo_item_for_response['tags']:
        try: updated_todo_item_for_response['tags'] = json.loads(updated_todo_item_for_response['tags'])
        except json.JSONDecodeError: updated_todo_item_for_response['tags'] = []
    else: updated_todo_item_for_response['tags'] = []
    print(f"PUT /api/todos/{id}，事項已更新。回傳資料：{updated_todo_item_for_response}")
    return jsonify(updated_todo_item_for_response)

@app.route('/api/todos/<int:id>', methods=['DELETE'])
def delete_todo_from_db(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM todos WHERE id = ?', (id,))
    todo_row = cursor.fetchone()
    if todo_row is None:
        conn.close(); return jsonify({"error": "Todo not found"}), 404
    try:
        cursor.execute('DELETE FROM todos WHERE id = ?', (id,))
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback(); print(f"刪除事項 {id} 時資料庫錯誤：{e}")
        return jsonify({"error": "Database operation failed during delete"}), 500
    finally: conn.close()
    print(f"DELETE /api/todos/{id}，事項已從資料庫刪除")
    return '', 204

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)