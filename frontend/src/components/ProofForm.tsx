// src/components/ProofForm.tsx
import React, { useState } from "react";
import { submitProof } from "../zk/proofService.js";


export const ProofForm: React.FC = () => {
  const [bib, setBib] = useState("");
  const [time, setTime] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 

    const timePattern = /^([0-1]?\d|2[0-3]):[0-5]\d:[0-5]\d$/;
    if (!timePattern.test(time)) {
      alert("Finish time must be in HH:MM:SS format");
    return;
    }

    if (!bib) {
      alert("Bib number is required");
      return;   

    }
    submitProof(parseInt(bib), time) 

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
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Finish Time</label>
          <input
            type="text"
            value={time}
            placeholder="H:MM:SS"
            onChange={(e) => {
              setTime(e.target.value)
              }
            }
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition duration-200"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default ProofForm;