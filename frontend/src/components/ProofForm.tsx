// src/components/ProofForm.tsx
import React, { useState } from "react";
import { buildPoseidon } from "circomlibjs";

export const ProofForm: React.FC = () => {
  const [bib, setBib] = useState("");
  const [time, setTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);  // Add loading state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Form Details:", { bib, time });

    const timePattern = /^([0-1]?\d|2[0-3]):[0-5]\d:[0-5]\d$/;
    if (!timePattern.test(time)) {
      alert("Finish time must be in HH:MM:SS format");
      return;
    }

    if (!bib) {
      alert("Bib number is required");
      return;
    }

    setIsLoading(true);  // Start loading

    try {
      const poseidon = await buildPoseidon();
      
      // prepare data 
      const runner_bib = BigInt(bib);
      const runner_time = BigInt(time.replace(/[^0-9]/g, "") || "0"); // remove non-numeric characters
      const hash = poseidon([runner_bib, runner_time]);
      let leaf = poseidon.F.toObject(hash);
      leaf = leaf.toString();
      console.log("Generated leaf:", leaf);

      // this is where we would call the backend API to verify the proof
      // ---- CALL BACKEND API ----
      const URI = process.env.BACKEND_CLIENT_URL || "http://localhost:3001";
      const response = await fetch(URI + '/verify', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ leaf })
      });
      const result = await response.json();
      console.log("Backend response:", result);

      if (!response.ok) {
        // Handle errors based on response status or error codes
        if (result.code === "RUNNER_NOT_FOUND") {
          alert("Runner not found. Please check the bib number and finish time.");
          setBib("");
          setTime("");
        } else {
          alert("Verification failed: " + (result.message || "Unknown error"));
        }
        return;
      }

      // If we reach here, the proof was successfully verified
      alert("Proof submitted and verified successfully, congratulations!");

      // on success
      setBib("");
      setTime("");
    } catch (error) {
      console.error("Error generating Poseidon hash:", error);
      alert("Failed to generate proof. Please try again.");
    } finally {
      setIsLoading(false);  // Stop loading
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-xl font-semibold mb-4">Submit Proof</h3>
      <form className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">Bib Number</label>
          <input
            type="number"
            min={1}
            max={9999}
            value={bib}
            onChange={(e) => setBib(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}  // Disable input during loading
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Finish Time</label>
          <input
            type="text"
            value={time}
            placeholder="H:MM:SS"
            onChange={(e) => setTime(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}  // Disable input during loading
          />
        </div>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading}  // Disable button during loading
          className={`w-full px-4 py-2 rounded shadow transition duration-200 ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Submitting..." : "Submit"}  
        </button>
      </form>
    </div>
  );
};

export default ProofForm;