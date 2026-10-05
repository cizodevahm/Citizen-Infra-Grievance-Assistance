import GrievanceForm from "@/components/GrievanceForm";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navbar with Track Request & Log In buttons */}
      <Navbar />

      {/* Main Content: Direct Centered Form */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12">
        <GrievanceForm />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto bg-white/50 dark:bg-slate-950/50">
        <p>Citizen Infrastructure Grievance Assistance Portal &bull; Public Civic Support System</p>
      </footer>
    </div>
  );
}
