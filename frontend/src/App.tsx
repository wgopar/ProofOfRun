// src/App.tsx
import { DashboardCard } from "./components/DashboardCard.js";
import { ProofForm } from "./components/ProofForm.js";
import { useWallet } from "./hooks/useWallet.js";

function App() {

  const { account, connectWallet } = useWallet();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <h1 className="text-2xl font-bold p-4 border-b border-gray-700">ProofOfRun</h1>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="block py-2 px-3 rounded hover:bg-gray-700">Dashboard</a>
          <a href="#" className="block py-2 px-3 rounded hover:bg-gray-700">Submissions</a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">San Francisco Marathon 2025 Verifier</h2>
          {account ? (
            <span className="px-4 py-2 bg-green-500 text-white rounded">{account}</span>
          ) : (
            <button
              onClick={connectWallet}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Connect Wallet
            </button>
          )}
        </header>

        {/* Dashboard stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <DashboardCard title="Total Runners" value="6,537" />
          <DashboardCard title="Proofs Submitted" value="4,892" />
        </div>

        {/* Proof submission + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ProofForm />
          </div>

          {/* Activity / chart placeholder */}
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-semibold mb-4">Recent Submissions</h3>
            <div className="h-64 bg-gray-200 flex items-center justify-center text-gray-500">
              Chart Placeholder
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;