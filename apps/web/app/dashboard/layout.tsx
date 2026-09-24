
import DashboardNav from './components/DashboardNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <DashboardNav />

      <main className="min-h-screen lg:pl-64">
        {children}
      </main>
    </div>
  );
}

