# flask-todo-list-app
A simple to-do list application built with Flask, SQLite, HTML, CSS, and JavaScript
# Flask 全功能待辦事項應用程式 (Flask Full-Featured To-Do List App)

> 這是一個使用 Python Flask 框架與原生 JavaScript 打造的全功能待辦事項 (To-Do List) 網頁應用程式。專案從一個簡單的待辦事項列表，逐步擴展成一個支援使用者註冊登入、具備完整 CRUD 功能、支援子任務、擁有詳細屬性編輯與深色模式的完整應用。

這個專案旨在展示如何結合 Flask 後端 API 與原生 JavaScript 前端，來建構一個現代化的動態網頁應用程式。

## ✨ 功能亮點 (Key Features)

* **使用者認證系統**:
    * 使用者註冊、登入與登出功能。
    * 使用 Session 進行狀態管理，確保操作安全。
    * 密碼使用 `werkzeug.security` 進行雜湊加密，提升安全性。
* **完整的待辦事項管理 (CRUD)**:
    * **新增 (Create)**: 建立新的待辦事項。
    * **讀取 (Read)**: 顯示所有事項，並支援階層式子任務結構。
    * **更新 (Update)**: 透過彈出式視窗，可完整編輯事項的**所有屬性**。
    * **刪除 (Delete)**: 移除待辦事項（刪除父任務會一併刪除其下所有子任務）。
* **豐富的事項屬性**:
    * **子任務 (Sub-tasks)**: 支援無限層級的子任務，形成樹狀結構。
    * **優先順序 (Priority)**: 分為高、中、低三個等級，並以顏色標示。
    * **截止日期 (Due Date)**: 可設定具體到分鐘的完成期限。
    * **備註 (Notes)**: 為每個事項添加詳細的文字說明，並預設顯示。
    * **標籤 (Tags)**: 為事項分類，方便管理與搜尋。
* **互動式使用者介面**:
    * **即時搜尋**: 可根據標題、備註、標籤內容，動態篩選待辦事項。
    * **深色/淺色模式**: 提供主題切換功能，並將使用者偏好儲存在瀏覽器中。
    * **響應式設計**: 介面在不同大小的螢幕上都能良好顯示。
* **RESTful API 設計**:
    * 後端採用 RESTful 風格設計 API，實現前後端分離。

## 🛠️ 技術棧 (Tech Stack)

* **後端 (Backend)**:
    * **Python 3**
    * **Flask**: 輕量級的 Web 框架。
    * **Werkzeug**: 用於密碼安全雜湊。
    * **SQLite**: 作為檔案型資料庫，方便部署。
* **前端 (Frontend)**:
    * **HTML5**
    * **CSS3**: 使用 CSS 變數實現深色模式。
    * **原生 JavaScript (ES6+)**: 無任何框架，專注於 DOM 操作與非同步請求 (Fetch API)。
    * **Font Awesome**: 提供專案中使用的圖示 (Icons)。
* **開發工具**:
    * **Git & GitHub**: 進行版本控制。
    * **Python Virtual Environment**: 管理專案依賴。

## 🚀 快速開始 (Getting Started)

請依照以下步驟在您的本機環境中安裝並執行此專案。

### 環境需求

* Python 3.8 或更高版本
* Git

### 安裝步驟

1.  **複製儲存庫到您的本機：**
    ```bash
    git clone [https://github.com/RCO5794/flask-todo-list-app.git](https://github.com/RCO5794/flask-todo-list-app.git)
    cd flask-todo-list-app
    ```

2.  **建立並啟用 Python 虛擬環境：**
    * **macOS / Linux:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    * **Windows:**
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```

3.  **建立 `requirements.txt` 檔案：**
    在專案根目錄下，建立一個名為 `requirements.txt` 的檔案，並貼上以下內容：
    ```
    Flask
    Flask-Cors
    ```

4.  **安裝專案所需的套件：**
    ```bash
    pip install -r requirements.txt
    ```

## 🏃‍♂️ 如何執行 (Running the Application)

1.  確認您已在專案的根目錄，並且虛擬環境已啟用。
2.  執行以下指令來啟動 Flask 開發伺服器：
    ```bash
    flask run
    ```
    或者
    ```bash
    python app.py
    ```

3.  伺服器啟動後，打開您的瀏覽器，訪問以下網址：
    ```
    [http://127.0.0.1:5000](http://127.0.0.1:5000)
    ```

4.  您將被導向登入頁面。您可以註冊一個新帳號，或使用內建的測試帳號登入：
    * **帳號**: `andy`
    * **密碼**: `1234`

## 📂 專案結構 (Project Structure)

```
.
├── app.py              # Flask 後端主應用程式
├── requirements.txt    # Python 依賴套件列表
├── todos.db            # SQLite 資料庫檔案
├── .gitignore          # Git 忽略清單
├── static/             # 存放靜態檔案
│   ├── login.css
│   ├── login.js
│   ├── register.js
│   ├── script.js
│   └── style.css
└── templates/          # 存放 HTML 模板
    ├── index.html
    ├── login.html
    └── register.html
```

---
