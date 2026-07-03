/**
 * Unit Tests for Storage Manager Error Handling
 *
 * Tests Requirements:
 * - 8.5: Parse error returns default value
 * - 8.6: Quota exceeded displays notification and returns false
 * - Storage unavailable falls back gracefully
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const createMockStorage = () => {
	const store = new Map();
	return {
		getItem: vi.fn((key) => store.get(key) || null),
		setItem: vi.fn((key, value) => store.set(key, value)),
		removeItem: vi.fn((key) => store.delete(key)),
		clear: vi.fn(() => store.clear()),
		get length() {
			return store.size;
		},
		key: vi.fn((index) => Array.from(store.keys())[index] || null),
	};
};

// Import StorageManager after setting up mocks
let StorageManager;
let STORAGE_KEYS;

describe("StorageManager Error Handling", () => {
	let originalLocalStorage;
	let mockStorage;

	beforeEach(async () => {
		// Reset module imports
		vi.resetModules();

		// Create fresh mock storage
		mockStorage = createMockStorage();

		// Store original localStorage
		originalLocalStorage = global.localStorage;

		// Replace with mock
		global.localStorage = mockStorage;

		// Import the module fresh
		const appModule = await import("../../js/app.js");
		StorageManager = appModule.StorageManager;
		STORAGE_KEYS = appModule.STORAGE_KEYS;

		// Initialize StorageManager
		StorageManager.init();
	});

	afterEach(() => {
		// Restore original localStorage
		global.localStorage = originalLocalStorage;
		vi.restoreAllMocks();
	});

	describe("Parse Error Handling", () => {
		it("should return default value when stored data is not valid JSON", () => {
			// Arrange: Store invalid JSON
			mockStorage.setItem("test_key", "not valid {json}");

			// Act: Try to get the value
			const result = StorageManager.get("test_key", "default_value");

			// Assert: Should return default value
			expect(result).toBe("default_value");
		});

		it("should return default value when stored data is corrupted", () => {
			// Arrange: Store corrupted JSON
			mockStorage.setItem("test_key", '{"incomplete": "object"');

			// Act: Try to get the value
			const result = StorageManager.get("test_key", { fallback: true });

			// Assert: Should return default value
			expect(result).toEqual({ fallback: true });
		});

		it("should return default value when key does not exist", () => {
			// Act: Try to get non-existent key
			const result = StorageManager.get("non_existent_key", "default");

			// Assert: Should return default value
			expect(result).toBe("default");
		});

		it("should return default value for various data types", () => {
			// Test with string default
			expect(StorageManager.get("key1", "string")).toBe("string");

			// Test with number default
			expect(StorageManager.get("key2", 42)).toBe(42);

			// Test with boolean default
			expect(StorageManager.get("key3", true)).toBe(true);

			// Test with object default
			expect(StorageManager.get("key4", { a: 1 })).toEqual({ a: 1 });

			// Test with array default
			expect(StorageManager.get("key5", [1, 2, 3])).toEqual([1, 2, 3]);
		});

		it("should not throw error when parse fails", () => {
			// Arrange: Store invalid JSON
			mockStorage.setItem("test_key", "invalid json");

			// Act & Assert: Should not throw
			expect(() => {
				StorageManager.get("test_key", "safe_default");
			}).not.toThrow();
		});
	});

	describe("Quota Exceeded Handling", () => {
		it("should return false when storage quota is exceeded", () => {
			// Arrange: Make setItem throw QuotaExceededError
			const quotaError = new Error("QuotaExceededError");
			quotaError.name = "QuotaExceededError";
			mockStorage.setItem.mockImplementation(() => {
				throw quotaError;
			});

			// Spy on showNotification
			const notificationSpy = vi.spyOn(StorageManager, "showNotification");

			// Act: Try to save data
			const result = StorageManager.set("test_key", "test_value");

			// Assert: Should return false
			expect(result).toBe(false);

			// Assert: Should call showNotification
			expect(notificationSpy).toHaveBeenCalledWith(
				"Storage full. Data will be saved for this session only.",
			);
		});

		it("should not crash application when quota exceeded", () => {
			// Arrange: Make setItem throw QuotaExceededError
			const quotaError = new Error("QuotaExceededError");
			quotaError.name = "QuotaExceededError";
			mockStorage.setItem.mockImplementation(() => {
				throw quotaError;
			});

			// Act & Assert: Should not throw
			expect(() => {
				StorageManager.set("test_key", "test_value");
			}).not.toThrow();
		});

		it("should allow continued operation in-memory after quota exceeded", () => {
			// Arrange: Make setItem throw QuotaExceededError
			const quotaError = new Error("QuotaExceededError");
			quotaError.name = "QuotaExceededError";
			mockStorage.setItem.mockImplementation(() => {
				throw quotaError;
			});

			// Act: Try to save data multiple times
			const result1 = StorageManager.set("key1", "value1");
			const result2 = StorageManager.set("key2", "value2");

			// Assert: Both should return false but not crash
			expect(result1).toBe(false);
			expect(result2).toBe(false);
		});
	});

	describe("Storage Unavailable Handling", () => {
		it("should detect when localStorage is unavailable", () => {
			// Arrange: Make localStorage throw on access
			const unavailableStorage = {
				setItem: vi.fn(() => {
					throw new Error("SecurityError: Access denied");
				}),
				getItem: vi.fn(() => {
					throw new Error("SecurityError: Access denied");
				}),
				removeItem: vi.fn(),
			};

			global.localStorage = unavailableStorage;

			// Spy on showNotification
			const notificationSpy = vi.spyOn(StorageManager, "showNotification");

			// Act: Initialize StorageManager
			StorageManager.init();

			// Assert: isAvailable should be false
			expect(StorageManager.isAvailable).toBe(false);

			// Assert: Should show notification
			expect(notificationSpy).toHaveBeenCalledWith(
				"Storage unavailable. Data will not persist across sessions.",
			);
		});

		it("should return default value when storage is unavailable", () => {
			// Arrange: Set isAvailable to false
			StorageManager.isAvailable = false;

			// Act: Try to get value
			const result = StorageManager.get("test_key", "default");

			// Assert: Should return default
			expect(result).toBe("default");
		});

		it("should return false when trying to set value with unavailable storage", () => {
			// Arrange: Set isAvailable to false
			StorageManager.isAvailable = false;

			// Act: Try to set value
			const result = StorageManager.set("test_key", "test_value");

			// Assert: Should return false
			expect(result).toBe(false);
		});

		it("should not throw error when storage operations fail", () => {
			// Arrange: Set isAvailable to false
			StorageManager.isAvailable = false;

			// Act & Assert: Operations should not throw
			expect(() => StorageManager.get("key", "default")).not.toThrow();
			expect(() => StorageManager.set("key", "value")).not.toThrow();
			expect(() => StorageManager.remove("key")).not.toThrow();
		});

		it("should gracefully handle storage unavailable in private browsing mode", () => {
			// Arrange: Simulate private browsing (storage exists but throws on use)
			const privateStorage = {
				setItem: vi.fn(() => {
					throw new Error("QuotaExceededError");
				}),
				getItem: vi.fn(() => null),
				removeItem: vi.fn(),
			};

			global.localStorage = privateStorage;

			// Act: Initialize
			StorageManager.init();

			// Assert: Should detect unavailability
			expect(StorageManager.isAvailable).toBe(false);
		});
	});

	describe("General Error Handling", () => {
		it("should handle unexpected errors in set operation", () => {
			// Arrange: Make setItem throw unexpected error
			mockStorage.setItem.mockImplementation(() => {
				throw new Error("Unexpected storage error");
			});

			// Act: Try to set value
			const result = StorageManager.set("test_key", "test_value");

			// Assert: Should return false
			expect(result).toBe(false);
		});

		it("should handle circular reference in JSON.stringify", () => {
			// Arrange: Create circular reference
			const circular = { a: 1 };
			circular.self = circular;

			// Act: Try to save circular object
			const result = StorageManager.set("test_key", circular);

			// Assert: Should return false (can't stringify circular)
			expect(result).toBe(false);
		});

		it("should handle remove operation safely when storage unavailable", () => {
			// Arrange: Set isAvailable to false
			StorageManager.isAvailable = false;

			// Act & Assert: Should not throw
			expect(() => StorageManager.remove("test_key")).not.toThrow();
		});
	});
});
