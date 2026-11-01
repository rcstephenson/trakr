import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureSeeded, requestPersistentStorage } from './db/seed';
import { applyTheme } from './lib/theme';
import './styles/index.css';

applyTheme('system');

async function bootstrap() {
  await ensureSeeded();
  void requestPersistentStorage();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
