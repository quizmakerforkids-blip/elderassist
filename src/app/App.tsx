import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AppProviders } from './providers/AppProviders';
import { Toaster } from '../components/feedback/Toaster';
import { AiAssistant } from '../components/ai/AiAssistant';

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
        <AiAssistant />
      </BrowserRouter>
    </AppProviders>
  );
}
