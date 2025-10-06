import React, { useState } from "react";

import { testRankingReturn } from "../test-rank-return";
import { runRankingTests } from "../ranking-tests";

export const RankingTestPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string>("");

  const runHelperTests = () => {
    setIsRunning(true);
    setResults("Running helper tests...\n");

    try {
      // Capture console output
      const originalLog = console.log;
      let output = "";

      console.log = (...args) => {
        output += args.join(" ") + "\n";
        originalLog(...args);
      };

      runRankingTests();

      console.log = originalLog;
      setResults(output);
    } catch (error) {
      setResults(`Error: ${error}`);
    }

    setIsRunning(false);
  };

  const runReturnTest = async () => {
    setIsRunning(true);
    setResults("Running return test...\n");

    try {
      const originalLog = console.log;
      let output = "";

      console.log = (...args) => {
        output += args.join(" ") + "\n";
        originalLog(...args);
      };

      await testRankingReturn();

      console.log = originalLog;
      setResults(output);
    } catch (error) {
      setResults(`Error: ${error}`);
    }

    setIsRunning(false);
  };

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
      <h3>🧪 Ranking Tests</h3>

      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={runHelperTests}
          disabled={isRunning}
          style={{ marginRight: "10px" }}
        >
          Test Helper Functions
        </button>

        <button onClick={runReturnTest} disabled={isRunning}>
          Test Rank Return
        </button>
      </div>

      {isRunning && <div>⏳ Running tests...</div>}

      {results && (
        <pre
          style={{
            background: "#f5f5f5",
            padding: "10px",
            maxHeight: "400px",
            overflow: "auto",
            fontSize: "12px",
          }}
        >
          {results}
        </pre>
      )}
    </div>
  );
};

export default RankingTestPanel;
