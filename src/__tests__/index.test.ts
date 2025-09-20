// Mock yargs before importing the main module
jest.mock("yargs/yargs", () => {
  return jest.fn(() => ({
    option: jest.fn().mockReturnThis(),
    help: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    parseSync: jest.fn().mockReturnValue({
      verbose: false,
    }),
  }));
});

jest.mock("yargs/helpers", () => ({
  hideBin: jest.fn((args) => args.slice(2)),
}));

import { main } from "../index";

describe("k8s-controller", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should export main function", () => {
    expect(typeof main).toBe("function");
  });

  it("should run without errors", () => {
    expect(() => main()).not.toThrow();
  });

  it("should log startup message", () => {
    const consoleSpy = jest.spyOn(console, "log");
    main();
    expect(consoleSpy).toHaveBeenCalledWith("ioBroker Kubernetes Controller");
  });
});
