import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/context/ToastContext';
import { DialogProvider } from '@/context/DialogContext';
import AppRoutes from '@/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <DialogProvider>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </DialogProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}