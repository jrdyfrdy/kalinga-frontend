import { useState } from 'react';
import ResponderSidebar from '../components/responder/Sidebar';
import { NavbarB } from '../components/Navbar_2';
import ResponderMessages from '../components/responder/Messages';

export default function Messages() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <ResponderSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main content wrapper */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          collapsed ? 'wl-16' : 'wl-64'
        }`}
      >
        {/* Navbar */}
        <div className="sticky top-0 z-10 bg-background">
          <NavbarB />
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-hidden">
          <ResponderMessages />
        </main>
      </div>
    </div>
  );
}
