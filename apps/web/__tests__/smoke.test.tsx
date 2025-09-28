import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Page from "../app/page";

describe("web smoke", () => {
  it("renders the dashboard", () => {
    const html = renderToString(<Page />);
    expect(html).toContain("Auto-Revoke Dashboard");
    expect(html).toContain("Create Delegation");
    expect(html).toContain("Guardian Status");
  });
});
