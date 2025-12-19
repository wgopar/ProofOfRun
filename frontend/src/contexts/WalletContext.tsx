import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface WalletContextProps {
  account: string | null;
  connectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextProps>({
  account: null,
  connectWallet: async () => {},
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (err) {
        console.error("User rejected wallet connection");
      }
    } else {
      alert("Metamask not installed!");
    }
  };

  // Optional: auto-connect if already authorized
  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length) setAccount(accounts[0]);
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ account, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};