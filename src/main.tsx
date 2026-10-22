import { createRoot } from 'react-dom/client';
import './styles.css';
// v0.2 设计 Token（复制自 design/tv-tokens-v0.2.css），放在 styles.css 之后让兼容层生效
import './tokens.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
