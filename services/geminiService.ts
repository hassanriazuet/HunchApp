// Minimal stub for geminiService used by IdeasScreen while upstream service is not available.
// This returns a tiny analysis object to avoid runtime crashes.

export async function getMarketAnalysis(question: string | undefined) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        bullCase: `Bull case for: ${question ?? "unknown"}`,
        bearCase: `Bear case for: ${question ?? "unknown"}`,
        sentiment: "Neutral",
      });
    }, 250);
  });
}
