## 開発環境のAPIエンドポイント設定

- フロントエンドのAPIエンドポイントは`frontend/.env`の`REACT_APP_BACKEND_URL`で指定してください。
- 例: `REACT_APP_BACKEND_URL=http://localhost:3001`
- スマホ実機からアクセスする場合は、PCのローカルIPアドレスを指定してください。
  - 例: `REACT_APP_BACKEND_URL=http://192.168.0.10:3001`
- `.env.example`も参照してください。

## CORS設定について
- `backend/src/server.ts`のCORS許可リストには、ローカル開発用の`localhost`や`127.0.0.1`、自分のIPアドレスを含めてOKです。
- 本番環境では本番ドメインのみを許可してください。

## スマホ実機での動作確認
- PCとスマホを同じWiFiに接続し、PCのIPアドレスでアクセスしてください。
- 例: `http://192.168.0.10:3000`
- `.env`のAPIエンドポイントも同じIPアドレスに合わせてください。

## 注意
- `.env`やCORSの設定は**本番環境と開発環境で分けて管理**してください。
- ローカル用のIPやlocalhostはGitHubに公開しても問題ありません。 
