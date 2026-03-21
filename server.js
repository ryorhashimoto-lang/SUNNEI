
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * データベースの初期化
 */
const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        plan TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        contact_person TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // カラム追加のパッチ
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person TEXT;`);

  　 // 【修正】テスト環境では初期データを挿入しない
    if (process.env.NODE_ENV !== 'test') {
      // 管理者およびデモデータの挿入（UPSERTロジックに変更）
      await client.query(`
        INSERT INTO companies (id, name, plan, password_hash, usage_count, contact_person)
        VALUES 
          ('admin', 'システム管理者', 'ENTERPRISE', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 0, '本部担当者'),
          ('demo', 'デモ葬儀社', 'STANDARD', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 12, '佐藤 健二'),
          ('demo_ent', '瞬影メモリアル 本部', 'ENTERPRISE', '2064505391c53229b43343603d6f78f888da76c81335359c381f621350a4d538', 450, '鈴木 一郎')
        ON CONFLICT (id) DO UPDATE SET 
          password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          plan = EXCLUDED.plan;
      `);
    }
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    client.release();
  }
};

initDb();

/**
 * 定期実行（Cron）方式による月次リセット処理
 * 毎月1日の 00:00 に実行
 */
cron.schedule('0 0 1 * *', async () => {
  console.log('[Scheduled Task] 月次利用枚数のリセットを開始します...');
  try {
    const result = await pool.query('UPDATE companies SET usage_count = 0');
    console.log(`[Scheduled Task] リセット完了: ${result.rowCount} 件の加盟店データを更新しました。`);
  } catch (err) {
    console.error('[Scheduled Task] リセット処理に失敗しました:', err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Tokyo"
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// ログインAPI
app.post('/api/login', async (req, res) => {
  const { id, passwordHash } = req.body;
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (result.rows.length === 0 || result.rows[0].password_hash !== passwordHash) {
      return res.status(401).json({ message: 'IDまたはパスワードが正しくありません。' });
    }
    const company = result.rows[0];
    res.json({
      company: { id: company.id, name: company.name, plan: company.plan, usageCount: company.usage_count },
      token: `session-${Math.random().toString(36).substring(2)}`
    });
  } catch (err) {
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 管理用：加盟店一覧取得
app.get('/api/admin/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, plan, usage_count, contact_person, created_at FROM companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '取得失敗' });
  }
});

// 管理用：新規加盟店登録
app.post('/api/admin/companies', async (req, res) => {
  const { id, name, plan, passwordHash, contactPerson } = req.body;
  try {
    await pool.query(
      'INSERT INTO companies (id, name, plan, password_hash, contact_person) VALUES ($1, $2, $3, $4, $5)',
      [id, name, plan, passwordHash, contactPerson]
    );
    res.json({ message: '登録完了' });
  } catch (err) {
    res.status(500).json({ message: '登録失敗（ID重複など）' });
  }
});

// 管理用：プラン更新API
app.patch('/api/admin/companies/:id/plan', async (req, res) => {
  const { plan } = req.body;
  const { id } = req.params;
  try {
    await pool.query('UPDATE companies SET plan = $1 WHERE id = $2', [plan, id]);
    res.json({ message: 'プラン更新完了' });
  } catch (err) {
    res.status(500).json({ message: '更新失敗' });
  }
});

// 管理用：加盟店削除
app.delete('/api/admin/companies/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.json({ message: '削除完了' });
  } catch (err) {
    res.status(500).json({ message: '削除失敗' });
  }
});

// 利用枚数更新
app.post('/api/usage/increment', async (req, res) => {
  const { companyId } = req.body;
  try {
    const result = await pool.query(
      'UPDATE companies SET usage_count = usage_count + 1 WHERE id = $1 RETURNING usage_count',
      [companyId]
    );
    res.json({ usageCount: result.rows[0].usage_count });
  } catch (err) {
    res.status(500).json({ message: '更新失敗' });
  }
});
// 背景合成API
app.post('/api/synthesis/background', async (req, res) => {
  try {
    const { portraitBase64, backgroundOption } = req.body;
    
    if (!portraitBase64 || !backgroundOption) {
      return res.status(400).json({ message: '必須パラメータが不足しています' });
    }

    // 環境変数から Gemini API キーを取得
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Gemini API キーが設定されていません' });
    }

    // Gemini に合成を依頼（Node.js のバージョンに合わせた実装）
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'You are a professional image compositor. Replace the background of the portrait with the provided background image. Keep the person unchanged. Blend naturally. Output as PNG.' },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: portraitBase64.split(',')[1] // data:image/... の部分を削除
              }
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: backgroundOption // すでに base64 形式
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.0,
        }
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      return res.status(500).json({ message: 'Gemini API エラー', error: result });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'サーバーエラー', error: err.message });
  }
});

// 服装合成API
app.post('/api/synthesis/clothing', async (req, res) => {
  try {
    const { portraitBase64, clothingOption } = req.body;
    
    if (!portraitBase64 || !clothingOption) {
      return res.status(400).json({ message: '必須パラメータが不足しています' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Gemini API キーが設定されていません' });
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'You are a professional image compositor specializing in portrait clothing. Replace the clothing with the provided image. Keep the face and background unchanged. Blend naturally. Output as PNG.' },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: portraitBase64.split(',')[1]
              }
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: clothingOption
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.0,
        }
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      return res.status(500).json({ message: 'Gemini API エラー', error: result });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'サーバーエラー', error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => console.log(`Server running on port ${port}`));
