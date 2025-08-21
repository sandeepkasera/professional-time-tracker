// /app/(with-layout)/layout.tsx
"use client";

import { ReactNode } from "react";
import Sidebar from "../components/layout/sidebar"; // Your sidebar component
import Topbar from "../components/layout/topbar"; // Your sidebar component


export default function WithLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar />
            {/* Main */}
             <main className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                {children}
            </main>
        </div>
    );
}
