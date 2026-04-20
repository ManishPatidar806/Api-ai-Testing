import { Outlet } from 'react-router-dom';
import TopNavbar from '../components/layout/TopNavbar';

function AppLayout() {
  return (
    <div className="min-h-screen bg-transparent">
      <TopNavbar />
      <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
