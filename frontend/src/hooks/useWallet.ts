import { useState, useEffect } from "react";

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);

  // Detect MetaMask
  const connectWallet = async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (err) {
        console.error("User rejected wallet connection", err);
      }
    } else {
      alert("MetaMask not detected. Please install it!");
    }
  };

  // Optional: listen for account changes
  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
    }
  }, []);

  return { account, connectWallet };
}