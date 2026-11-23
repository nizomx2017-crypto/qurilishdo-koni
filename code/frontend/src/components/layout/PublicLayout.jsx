// Ochiq qism (mijoz): sarlavha + sahifa. Login talab qilinmaydi.
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function PublicLayout() {
  return (
    <>
      <Header />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
