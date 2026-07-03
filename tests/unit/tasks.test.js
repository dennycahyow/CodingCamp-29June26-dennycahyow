/**
 * Unit tests for Task Manager module
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskManager, STORAGE_KEYS } from "../../js/app.js";

describe("TaskManager", () => {
	// Mock localStorage
	let mockStorage = {};

	beforeEach(() => {
		// Reset mock storage
		mockStorage = {};

		// Mock localStorage
		global.localStorage = {
			getItem: vi.fn((key) => mockStorage[key] || null),
			setItem: vi.fn((key, value) => {
				mockStorage[key] = value;
			}),
			removeItem: vi.fn((key) => {
				delete mockStorage[key];
			}),
		};

		// Reset TaskManager state
		TaskManager.state.tasks = [];
	});

	describe("validateTaskText", () => {
		it("should accept valid task text (1-500 chars)", () => {
			const result = TaskManager.validateTaskText("Buy milk");
			expect(result.valid).toBe(true);
		});

		it("should reject empty string", () => {
			const result = TaskManager.validateTaskText("");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("empty");
		});

		it("should reject whitespace-only text", () => {
			const result = TaskManager.validateTaskText("   ");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("empty");
		});

		it("should reject text longer than 500 chars", () => {
			const longText = "a".repeat(501);
			const result = TaskManager.validateTaskText(longText);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("1-500");
		});

		it("should accept text exactly 500 chars", () => {
			const exactText = "a".repeat(500);
			const result = TaskManager.validateTaskText(exactText);
			expect(result.valid).toBe(true);
		});
	});

	describe("isDuplicate", () => {
		beforeEach(() => {
			// Add some test tasks
			TaskManager.state.tasks = [
				{ id: "1", text: "Buy Milk", completed: false, createdAt: 1000 },
				{ id: "2", text: "Walk Dog", completed: false, createdAt: 2000 },
			];
		});

		it("should detect exact duplicate (case-insensitive)", () => {
			expect(TaskManager.isDuplicate("buy milk")).toBe(true);
			expect(TaskManager.isDuplicate("BUY MILK")).toBe(true);
			expect(TaskManager.isDuplicate("Buy Milk")).toBe(true);
		});

		it("should not detect non-duplicate", () => {
			expect(TaskManager.isDuplicate("Buy Bread")).toBe(false);
		});

		it("should exclude self when editing", () => {
			expect(TaskManager.isDuplicate("Buy Milk", "1")).toBe(false);
		});

		it("should still detect duplicate of another task when editing", () => {
			expect(TaskManager.isDuplicate("Walk Dog", "1")).toBe(true);
		});
	});

	describe("addTask", () => {
		it("should add a valid task", () => {
			const result = TaskManager.addTask("Buy milk");
			expect(result.success).toBe(true);
			expect(TaskManager.state.tasks).toHaveLength(1);
			expect(TaskManager.state.tasks[0].text).toBe("Buy milk");
			expect(TaskManager.state.tasks[0].completed).toBe(false);
		});

		it("should trim task text before saving", () => {
			const result = TaskManager.addTask("  Buy milk  ");
			expect(result.success).toBe(true);
			expect(TaskManager.state.tasks[0].text).toBe("Buy milk");
		});

		it("should reject duplicate task", () => {
			TaskManager.addTask("Buy milk");
			const result = TaskManager.addTask("buy milk"); // case-insensitive
			expect(result.success).toBe(false);
			expect(result.error).toContain("already exists");
			expect(TaskManager.state.tasks).toHaveLength(1);
		});

		it("should generate unique IDs", () => {
			TaskManager.addTask("Task 1");
			TaskManager.addTask("Task 2");
			expect(TaskManager.state.tasks[0].id).not.toBe(
				TaskManager.state.tasks[1].id,
			);
		});

		it("should set createdAt timestamp", () => {
			const beforeTime = Date.now();
			TaskManager.addTask("Buy milk");
			const afterTime = Date.now();
			const task = TaskManager.state.tasks[0];
			expect(task.createdAt).toBeGreaterThanOrEqual(beforeTime);
			expect(task.createdAt).toBeLessThanOrEqual(afterTime);
		});
	});

	describe("editTask", () => {
		beforeEach(() => {
			TaskManager.state.tasks = [
				{ id: "1", text: "Buy Milk", completed: false, createdAt: 1000 },
			];
		});

		it("should edit task text", () => {
			const result = TaskManager.editTask("1", "Buy Bread");
			expect(result.success).toBe(true);
			expect(TaskManager.state.tasks[0].text).toBe("Buy Bread");
		});

		it("should trim edited text", () => {
			const result = TaskManager.editTask("1", "  Buy Bread  ");
			expect(result.success).toBe(true);
			expect(TaskManager.state.tasks[0].text).toBe("Buy Bread");
		});

		it("should reject duplicate text (excluding self)", () => {
			TaskManager.state.tasks.push({
				id: "2",
				text: "Walk Dog",
				completed: false,
				createdAt: 2000,
			});
			const result = TaskManager.editTask("1", "Walk Dog");
			expect(result.success).toBe(false);
			expect(result.error).toContain("already exists");
		});

		it("should return error for non-existent task", () => {
			const result = TaskManager.editTask("999", "New Text");
			expect(result.success).toBe(false);
			expect(result.error).toContain("not found");
		});
	});

	describe("deleteTask", () => {
		beforeEach(() => {
			TaskManager.state.tasks = [
				{ id: "1", text: "Buy Milk", completed: false, createdAt: 1000 },
				{ id: "2", text: "Walk Dog", completed: false, createdAt: 2000 },
			];
		});

		it("should delete task by id", () => {
			TaskManager.deleteTask("1");
			expect(TaskManager.state.tasks).toHaveLength(1);
			expect(TaskManager.state.tasks[0].id).toBe("2");
		});

		it("should do nothing if task not found", () => {
			TaskManager.deleteTask("999");
			expect(TaskManager.state.tasks).toHaveLength(2);
		});
	});

	describe("toggleTaskStatus", () => {
		beforeEach(() => {
			TaskManager.state.tasks = [
				{ id: "1", text: "Buy Milk", completed: false, createdAt: 1000 },
			];
		});

		it("should toggle pending task to completed", () => {
			TaskManager.toggleTaskStatus("1");
			expect(TaskManager.state.tasks[0].completed).toBe(true);
		});

		it("should toggle completed task to pending", () => {
			TaskManager.state.tasks[0].completed = true;
			TaskManager.toggleTaskStatus("1");
			expect(TaskManager.state.tasks[0].completed).toBe(false);
		});
	});

	describe("sortTasks", () => {
		it("should sort pending tasks before completed tasks", () => {
			TaskManager.state.tasks = [
				{ id: "1", text: "Completed", completed: true, createdAt: 1000 },
				{ id: "2", text: "Pending", completed: false, createdAt: 2000 },
			];
			TaskManager.sortTasks();
			expect(TaskManager.state.tasks[0].text).toBe("Pending");
			expect(TaskManager.state.tasks[1].text).toBe("Completed");
		});

		it("should sort alphabetically within pending group", () => {
			TaskManager.state.tasks = [
				{ id: "1", text: "Zebra", completed: false, createdAt: 1000 },
				{ id: "2", text: "Apple", completed: false, createdAt: 2000 },
				{ id: "3", text: "Banana", completed: false, createdAt: 3000 },
			];
			TaskManager.sortTasks();
			expect(TaskManager.state.tasks[0].text).toBe("Apple");
			expect(TaskManager.state.tasks[1].text).toBe("Banana");
			expect(TaskManager.state.tasks[2].text).toBe("Zebra");
		});

		it("should sort alphabetically within completed group", () => {
			TaskManager.state.tasks = [
				{ id: "1", text: "Zebra", completed: true, createdAt: 1000 },
				{ id: "2", text: "Apple", completed: true, createdAt: 2000 },
				{ id: "3", text: "Banana", completed: true, createdAt: 3000 },
			];
			TaskManager.sortTasks();
			expect(TaskManager.state.tasks[0].text).toBe("Apple");
			expect(TaskManager.state.tasks[1].text).toBe("Banana");
			expect(TaskManager.state.tasks[2].text).toBe("Zebra");
		});

		it("should maintain stable sort by createdAt for equal text", () => {
			TaskManager.state.tasks = [
				{ id: "1", text: "task", completed: false, createdAt: 3000 },
				{ id: "2", text: "task", completed: false, createdAt: 1000 },
				{ id: "3", text: "task", completed: false, createdAt: 2000 },
			];
			TaskManager.sortTasks();
			expect(TaskManager.state.tasks[0].createdAt).toBe(1000);
			expect(TaskManager.state.tasks[1].createdAt).toBe(2000);
			expect(TaskManager.state.tasks[2].createdAt).toBe(3000);
		});

		it("should be case-insensitive when sorting", () => {
			TaskManager.state.tasks = [
				{ id: "1", text: "apple", completed: false, createdAt: 1000 },
				{ id: "2", text: "BANANA", completed: false, createdAt: 2000 },
				{ id: "3", text: "Cherry", completed: false, createdAt: 3000 },
			];
			TaskManager.sortTasks();
			expect(TaskManager.state.tasks[0].text).toBe("apple");
			expect(TaskManager.state.tasks[1].text).toBe("BANANA");
			expect(TaskManager.state.tasks[2].text).toBe("Cherry");
		});
	});
});
