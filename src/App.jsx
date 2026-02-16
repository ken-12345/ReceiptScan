import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { analyzeReceipt, fileToBase64, pdfToImageBase64, fetchAvailableModels } from './services/gemini';

// --- Components ---

const Settings = ({ apiKey, setApiKey, model, setModel, fetchedModels, setFetchedModels, theme, setTheme }) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [saved, setSaved] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    // 現在設定されているモデルがプリセットリストにない場合はカスタム扱いにする
    const presets = ['gemini-1.5-flash-latest', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
    const allKnown = [...presets, ...fetchedModels.map(m => m.id)];
    if (model && !allKnown.includes(model)) {
      setIsCustomModel(true);
      setCustomModelName(model);
    } else {
      setIsCustomModel(false);
    }
  }, [model, fetchedModels]);

  const handleSave = () => {
    const finalModel = isCustomModel ? customModelName : model;
    localStorage.setItem('gemini_api_key', inputKey);
    localStorage.setItem('gemini_model', finalModel);
    localStorage.setItem('gemini_theme', theme);
    setApiKey(inputKey);
    setModel(finalModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDelete = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setInputKey('');
  };

  const handleFetchModels = async () => {
    if (!inputKey) {
      setFetchError('先に API キーを入力してください。');
      return;
    }
    setIsFetching(true);
    setFetchError(null);
    try {
      const models = await fetchAvailableModels(inputKey);
      setFetchedModels(models);
      localStorage.setItem('gemini_available_models', JSON.stringify(models));
    } catch (err) {
      setFetchError(`取得失敗: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const onModelChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomModel(true);
    } else {
      setIsCustomModel(false);
      setModel(val);
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>設定</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>外観</h2>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">テーマ</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className={`btn ${theme === 'light' ? 'btn-primary' : ''}`}
              style={{ flex: 1, backgroundColor: theme === 'light' ? '' : 'var(--bg-primary)', color: theme === 'light' ? '' : 'var(--text-primary)' }}
              onClick={() => setTheme('light')}
            >
              ☀️ ライト
            </button>
            <button
              className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`}
              style={{ flex: 1, backgroundColor: theme === 'dark' ? '' : 'var(--bg-primary)', color: theme === 'dark' ? '' : 'var(--text-primary)' }}
              onClick={() => setTheme('dark')}
            >
              🌙 ダーク
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>API 設定</h2>
        <div className="input-group">
          <label className="label">Gemini API キー</label>
          <input
            type="password"
            className="input"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AI Studio から取得したキーを入力"
          />
        </div>

        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="label" style={{ marginBottom: 0 }}>使用する AI モデル</label>
            <button
              className="btn"
              onClick={handleFetchModels}
              disabled={isFetching}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-primary)' }}
            >
              {isFetching ? '取得中...' : '自動取得'}
            </button>
          </div>

          {fetchError && <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{fetchError}</p>}

          <select
            className="input"
            value={isCustomModel ? 'custom' : model}
            onChange={onModelChange}
          >
            <optgroup label="プリセット">
              <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (最新・推薦)</option>
              <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (高速)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (高性能)</option>
              {fetchedModels.map(m => (
                <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
              ))}
            </optgroup>
            <option value="custom">その他 (直接指定)</option>
          </select>

          {isCustomModel && (
            <input
              className="input"
              style={{ marginTop: '0.5rem' }}
              value={customModelName}
              onChange={(e) => setCustomModelName(e.target.value)}
              placeholder="モデル名を入力"
            />
          )}
        </div>

        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
          設定を保存
        </button>
        {saved && (
          <p style={{ color: 'var(--success)', marginTop: '0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>
            ✓ 保存しました
          </p>
        )}
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={() => {
            if (confirm('全ての履歴を消去しますか？')) {
              localStorage.removeItem('receipt_history');
              window.location.reload();
            }
          }}
          style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
        >
          全履歴を削除
        </button>
      </div>
    </div>
  );
};

const HistoryDetailModal = ({ item, onClose, onSave, onDelete }) => {
  const [edited, setEdited] = useState({ ...item });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem' }}>詳細情報</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div className="input-group">
            <label className="label">日付</label>
            <input className="input" value={edited.date} onChange={e => setEdited({ ...edited, date: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="label">支払先</label>
            <input className="input" value={edited.payee} onChange={e => setEdited({ ...edited, payee: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="label">金額 (¥)</label>
            <input type="number" className="input" value={edited.amount} onChange={e => setEdited({ ...edited, amount: Number(e.target.value) })} />
          </div>
          <div className="input-group">
            <label className="label">摘要</label>
            <input className="input" value={edited.description || edited.purpose || ''} onChange={e => setEdited({ ...edited, description: e.target.value })} />
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(edited)}>保存</button>
          <button className="btn" style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white' }} onClick={() => onDelete(item)}>削除</button>
        </div>
      </div>
    </div>
  );
};

const Home = ({ apiKey, model, history, setHistory }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (result) {
      setEditingResult(result);
    }
  }, [result]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let base64;
      let mimeType = file.type;

      if (file.type === 'application/pdf') {
        base64 = await pdfToImageBase64(file);
        mimeType = 'image/png';
      } else if (file.type.startsWith('image/')) {
        base64 = await fileToBase64(file);
      } else {
        throw new Error('未対応ファイルです');
      }

      const data = await analyzeReceipt(apiKey, base64, mimeType, model);
      setResult(data);
    } catch (err) {
      console.error("[Home] Analysis Error:", err);
      setError(`エラー: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
      e.target.value = '';
    }
  };

  const saveToHistory = (item) => {
    const newHistory = [item, ...history];
    setHistory(newHistory);
    localStorage.setItem('receipt_history', JSON.stringify(newHistory));
    setResult(null);
    setEditingResult(null);
  };

  const updateHistoryItem = (editedItem) => {
    const newHistory = history.map(h => h === selectedItem ? editedItem : h);
    setHistory(newHistory);
    localStorage.setItem('receipt_history', JSON.stringify(newHistory));
    setSelectedItem(null);
  };

  const deleteHistoryItem = (item) => {
    if (confirm('この履歴を削除しますか？')) {
      const newHistory = history.filter(h => h !== item);
      setHistory(newHistory);
      localStorage.setItem('receipt_history', JSON.stringify(newHistory));
      setSelectedItem(null);
    }
  };

  const totalAmount = history.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const exportToCSV = () => {
    const headers = ['日付', '金額', '支払先', '摘要'];
    const rows = history.map(item => [
      item.date,
      item.amount,
      item.payee,
      item.description || item.purpose
    ]);

    // 合計行を追加
    rows.push(['合計', totalAmount, '', '']);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <div style={{ margin: '2rem 0', textAlign: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current.click()}
          disabled={isAnalyzing}
          style={{ width: '100%', maxWidth: '320px', height: '140px', borderRadius: '1.5rem', flexDirection: 'column', fontSize: '1.125rem' }}
        >
          {isAnalyzing ? (
            '⌛ 解析中...'
          ) : (
            <>
              <span style={{ fontSize: '2rem' }}>📸</span>
              スキャンして取り込む
            </>
          )}
        </button>
        <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      {error && <div className="card" style={{ color: 'var(--error)', backgroundColor: 'rgba(239, 68, 68, 0.1)', marginBottom: '1.5rem' }}>{error}</div>}

      {editingResult && (
        <div className="card" style={{ border: '2px solid var(--primary)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>✨ 解析に成功しました</h2>
          <div className="input-group">
            <label className="label">日付</label>
            <input className="input" value={editingResult.date} onChange={e => setEditingResult({ ...editingResult, date: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="label">金額 (¥)</label>
            <input type="number" className="input" value={editingResult.amount} onChange={e => setEditingResult({ ...editingResult, amount: Number(e.target.value) })} />
          </div>
          <div className="input-group">
            <label className="label">支払先</label>
            <input className="input" value={editingResult.payee} onChange={e => setEditingResult({ ...editingResult, payee: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="label">摘要</label>
            <input className="input" value={editingResult.description || editingResult.purpose || ''} onChange={e => setEditingResult({ ...editingResult, description: e.target.value })} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => saveToHistory(editingResult)}>履歴に保存</button>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>履歴一覧</h2>
            <button className="btn" onClick={exportToCSV} style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}>📥 CSV保存</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((item, index) => (
              <div key={index} className="card" onClick={() => setSelectedItem(item)} style={{ padding: '1rem', cursor: 'pointer', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700' }}>{item.payee}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '700' }}>¥{item.amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <span>{item.date}</span>
                  <span>{item.description || item.purpose}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: '2rem', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-primary))', borderLeft: '5px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>合計キャッシュフロー</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)' }}>¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <HistoryDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={updateHistoryItem}
          onDelete={deleteHistoryItem}
        />
      )}
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash-latest');
  const [theme, setTheme] = useState('light');
  const [fetchedModels, setFetchedModels] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);

    const savedModel = localStorage.getItem('gemini_model');
    if (savedModel) setModel(savedModel);

    const savedTheme = localStorage.getItem('gemini_theme') || 'light';
    setTheme(savedTheme);

    const savedFetched = localStorage.getItem('gemini_available_models');
    if (savedFetched) setFetchedModels(JSON.parse(savedFetched));

    const savedHistory = localStorage.getItem('receipt_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Help Screen Component
  const Help = () => (
    <div className="container">
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>ヘルプ</h1>
      <div className="card" style={{ lineHeight: '1.8' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>基本的な使い方</h3>
        <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
          <li>「設定」で Gemini API キーを入力・保存します。</li>
          <li>「ホーム」のボタンからレシートの画像や PDF を選択します。</li>
          <li>AI が解析した結果（日付・金額・店名・摘要）を確認し、「保存」を押します。</li>
        </ol>

        <h3 style={{ marginBottom: '0.5rem' }}>便利な機能</h3>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
          <li><b>履歴詳細:</b> 保存した履歴をクリックすると詳細編集や削除ができます。</li>
          <li><b>合計表示:</b> 履歴の下部に全データの合計金額が自動表示されます。</li>
          <li><b>テーマ変更:</b> 設定からライト/ダークモードを選べます。</li>
          <li><b>エクスポート:</b> 履歴を CSV として保存でき、合計金額も記録されます。</li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <header>
        <div style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
          Receipt<span style={{ color: 'var(--text-primary)' }}>Scan</span>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>AI Assistant</div>
      </header>

      <main style={{ flex: 1, paddingBottom: '6rem' }}>
        {activeTab === 'home' && <Home apiKey={apiKey} model={model} history={history} setHistory={setHistory} />}
        {activeTab === 'settings' && (
          <Settings
            apiKey={apiKey}
            setApiKey={setApiKey}
            model={model}
            setModel={setModel}
            fetchedModels={fetchedModels}
            setFetchedModels={setFetchedModels}
            theme={theme}
            setTheme={setTheme}
          />
        )}
        {activeTab === 'help' && <Help />}
      </main>

      <nav>
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span style={{ fontSize: '1.5rem' }}>📊</span>
          <span>ホーム</span>
        </div>
        <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span style={{ fontSize: '1.5rem' }}>⚙️</span>
          <span>設定</span>
        </div>
        <div className={`nav-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>
          <span style={{ fontSize: '1.5rem' }}>💡</span>
          <span>ヘルプ</span>
        </div>
      </nav>
    </>
  );
}

export default App;
