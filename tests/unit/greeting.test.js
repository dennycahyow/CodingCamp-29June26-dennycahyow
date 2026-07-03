/**
 * Unit tests for Greeting Module
 * Tests specific behaviors and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { GreetingModule, StorageManager, STORAGE_KEYS } from "../../js/app.js";

describe("Greeting Module - Time and Date Formatting", () => {
	let dom;
	let document;

	beforeEach(() => {
		// Set up DOM
		dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <p id="greeting-text"></p>
          <p id="time-display"></p>
          <p id="date-display"></p>
          <input id="custom-name-input" type="text" />
          <button id="custom-name-save"></button>
          <p id="custom-name-error"></p>
        </body>
      </html>
    `);
		document = dom.window.document;
		global.document = document;

		// Mock StorageManager
		StorageManager.isAvailable = true;
		StorageManager.get = vi.fn(() => null);
		StorageManager.set = vi.fn(() => true);

		// Reset GreetingModule state
		GreetingModule.state = {
			currentTime: null,
			customName: null,
			intervalId: null,
		};
	});

	afterEach(() => {
		// Clean up interval
		if (GreetingModule.state.intervalId) {
			clearInterval(GreetingModule.state.intervalId);
			GreetingModule.state.intervalId = null;
		}
		vi.restoreAllMocks();
	});

	it("should format time as HH:MM:SS with leading zeros", () => {
		// Set a specific time: 09:05:03
		const testDate = new Date(2026, 6, 3, 9, 5, 3); // July 3, 2026, 09:05:03
		GreetingModule.state.currentTime = testDate;

		GreetingModule.render();

		const timeDisplay = document.getElementById("time-display");
		expect(timeDisplay.textContent).toBe("09:05:03");
	});

	it("should format time at 14:30:00 correctly", () => {
		const testDate = new Date(2026, 6, 3, 14, 30, 0);
		GreetingModule.state.currentTime = testDate;

		GreetingModule.render();

		const timeDisplay = document.getElementById("time-display");
		expect(timeDisplay.textContent).toBe("14:30:00");
	});

	it("should format time at 23:59:59 correctly", () => {
		const testDate = new Date(2026, 6, 3, 23, 59, 59);
		GreetingModule.state.currentTime = testDate;

		GreetingModule.render();

		const timeDisplay = document.getElementById("time-display");
		expect(timeDisplay.textContent).toBe("23:59:59");
	});

	it('should format date as "Weekday, Month Day, Year"', () => {
		// Friday, July 3, 2026
		const testDate = new Date(2026, 6, 3, 9, 5, 3);
		GreetingModule.state.currentTime = testDate;

		GreetingModule.render();

		const dateDisplay = document.getElementById("date-display");
		expect(dateDisplay.textContent).toBe("Friday, July 3, 2026");
	});
});

describe("Greeting Module - Greeting Selection", () => {
	beforeEach(() => {
		GreetingModule.state = {
			currentTime: null,
			customName: null,
			intervalId: null,
		};
	});

	it('should return "Good Morning" at 5:00', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 5, 0, 0);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Morning");
	});

	it('should return "Good Morning" at 11:59', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 11, 59, 59);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Morning");
	});

	it('should return "Good Evening" at 04:59', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 4, 59, 59);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Evening");
	});

	it('should return "Good Afternoon" at 12:00', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 12, 0, 0);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Afternoon");
	});

	it('should return "Good Afternoon" at 17:59', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 17, 59, 59);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Afternoon");
	});

	it('should return "Good Evening" at 18:00', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 18, 0, 0);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Evening");
	});

	it('should return "Good Evening" at 23:59', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 23, 59, 59);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Evening");
	});

	it('should return "Good Evening" at 00:00', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 0, 0, 0);
		expect(GreetingModule.getGreetingPrefix()).toBe("Good Evening");
	});
});

describe("Greeting Module - Custom Name Display", () => {
	let dom;
	let document;

	beforeEach(() => {
		dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <p id="greeting-text"></p>
          <p id="time-display"></p>
          <p id="date-display"></p>
          <input id="custom-name-input" type="text" />
          <button id="custom-name-save"></button>
          <p id="custom-name-error"></p>
        </body>
      </html>
    `);
		document = dom.window.document;
		global.document = document;

		StorageManager.isAvailable = true;
		StorageManager.get = vi.fn(() => null);
		StorageManager.set = vi.fn(() => true);

		GreetingModule.state = {
			currentTime: null,
			customName: null,
			intervalId: null,
		};
	});

	it("should display greeting without name when no custom name is set", () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 9, 0, 0); // Morning
		GreetingModule.state.customName = null;

		GreetingModule.render();

		const greetingText = document.getElementById("greeting-text");
		expect(greetingText.textContent).toBe("Good Morning!");
	});

	it('should display greeting with custom name "Alice"', () => {
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 9, 0, 0); // Morning
		GreetingModule.state.customName = "Alice";

		GreetingModule.render();

		const greetingText = document.getElementById("greeting-text");
		expect(greetingText.textContent).toBe("Good Morning, Alice!");
	});

	it("should display greeting with custom name at different times", () => {
		GreetingModule.state.customName = "Bob";

		// Afternoon
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 15, 0, 0);
		GreetingModule.render();
		let greetingText = document.getElementById("greeting-text");
		expect(greetingText.textContent).toBe("Good Afternoon, Bob!");

		// Evening
		GreetingModule.state.currentTime = new Date(2026, 6, 3, 20, 0, 0);
		GreetingModule.render();
		greetingText = document.getElementById("greeting-text");
		expect(greetingText.textContent).toBe("Good Evening, Bob!");
	});
});

describe("Greeting Module - Custom Name Validation", () => {
	it("should accept valid names with letters", () => {
		const result = GreetingModule.validateName("Alice");
		expect(result.valid).toBe(true);
	});

	it("should accept names with spaces", () => {
		const result = GreetingModule.validateName("Mary Jane");
		expect(result.valid).toBe(true);
	});

	it("should accept names with hyphens", () => {
		const result = GreetingModule.validateName("Anne-Marie");
		expect(result.valid).toBe(true);
	});

	it("should accept names with apostrophes", () => {
		const result = GreetingModule.validateName("O'Brien");
		expect(result.valid).toBe(true);
	});

	it("should accept names with mixed valid characters", () => {
		const result = GreetingModule.validateName("Mary-Jane O'Brien");
		expect(result.valid).toBe(true);
	});

	it("should reject empty string", () => {
		const result = GreetingModule.validateName("");
		expect(result.valid).toBe(false);
		expect(result.error).toContain("1-50 characters");
	});

	it("should reject names longer than 50 characters", () => {
		const longName = "a".repeat(51);
		const result = GreetingModule.validateName(longName);
		expect(result.valid).toBe(false);
		expect(result.error).toContain("1-50 characters");
	});

	it("should accept names with exactly 50 characters", () => {
		const exactName = "a".repeat(50);
		const result = GreetingModule.validateName(exactName);
		expect(result.valid).toBe(true);
	});

	it("should reject names with numbers", () => {
		const result = GreetingModule.validateName("Alice123");
		expect(result.valid).toBe(false);
		expect(result.error).toContain("letters, spaces, hyphens, and apostrophes");
	});

	it("should reject names with special characters", () => {
		const result = GreetingModule.validateName("Alice@");
		expect(result.valid).toBe(false);
	});

	it("should reject names with underscores", () => {
		const result = GreetingModule.validateName("Alice_Smith");
		expect(result.valid).toBe(false);
	});
});
