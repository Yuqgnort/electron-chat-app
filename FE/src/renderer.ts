import "./ui";

// Import ranking tests trong development mode
if (process.env.NODE_ENV === "development") {
  import("./test/ranking/console-ranking-test");
}
