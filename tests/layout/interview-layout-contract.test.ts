// @vitest-environment node
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * CSS contract test — asserts that critical layout properties remain in place.
 *
 * The interview page relies on a specific flex containment chain so that only
 * the transcript area scrolls (not the entire <main>). Removing any of these
 * properties re-introduces the bug where the header and input scroll off-screen.
 */

function readCss(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), "src", relativePath), "utf-8");
}

function cssBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Selector "${selector}" not found in CSS`);
  return match[1]!;
}

describe("interview layout CSS contract", () => {
  const appLayout = readCss("app/(app)/layout.module.css");
  const interviewLayout = readCss("app/(app)/interview/layout.module.css");
  const sessionCss = readCss("components/interview/interview-session.module.css");

  describe(".main (app layout)", () => {
    const block = cssBlock(appLayout, ".main");

    it("is a flex container so children can use flex: 1", () => {
      expect(block).toMatch(/display:\s*flex/);
      expect(block).toMatch(/flex-direction:\s*column/);
    });
  });

  describe(".container (interview layout)", () => {
    const block = cssBlock(interviewLayout, ".container");

    it("contains overflow so only the transcript scrolls", () => {
      expect(block).toMatch(/overflow:\s*hidden/);
    });

    it("fills available space as a flex child", () => {
      expect(block).toMatch(/flex:\s*1/);
      expect(block).toMatch(/min-height:\s*0/);
    });
  });

  describe(".sessionContainer (interview session)", () => {
    const block = cssBlock(sessionCss, ".sessionContainer");

    it("fills parent height and hides overflow", () => {
      expect(block).toMatch(/height:\s*100%/);
      expect(block).toMatch(/overflow:\s*hidden/);
    });
  });

  describe(".header (interview session)", () => {
    const block = cssBlock(sessionCss, ".header");

    it("is sticky so it stays visible during scroll", () => {
      expect(block).toMatch(/position:\s*sticky/);
    });
  });
});
