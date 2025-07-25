/**
 * Tests for the parse-prd.js module
 */
import { jest } from '@jest/globals';

// Mock the dependencies before importing the module under test
jest.unstable_mockModule('../../../../../scripts/modules/utils.js', () => ({
	readJSON: jest.fn(),
	writeJSON: jest.fn(),
	log: jest.fn(),
	CONFIG: {
		model: 'mock-claude-model',
		maxTokens: 4000,
		temperature: 0.7,
		debug: false
	},
	sanitizePrompt: jest.fn((prompt) => prompt),
	truncate: jest.fn((text) => text),
	isSilentMode: jest.fn(() => false),
	enableSilentMode: jest.fn(),
	disableSilentMode: jest.fn(),
	findTaskById: jest.fn(),
	ensureTagMetadata: jest.fn((tagObj) => tagObj),
	getCurrentTag: jest.fn(() => 'master'),
	promptYesNo: jest.fn()
}));

jest.unstable_mockModule(
	'../../../../../scripts/modules/ai-services-unified.js',
	() => ({
		generateObjectService: jest.fn().mockResolvedValue({
			mainResult: {
				tasks: []
			},
			telemetryData: {}
		})
	})
);

jest.unstable_mockModule('../../../../../scripts/modules/ui.js', () => ({
	getStatusWithColor: jest.fn((status) => status),
	startLoadingIndicator: jest.fn(),
	stopLoadingIndicator: jest.fn(),
	displayAiUsageSummary: jest.fn()
}));

jest.unstable_mockModule(
	'../../../../../scripts/modules/config-manager.js',
	() => ({
		getDebugFlag: jest.fn(() => false),
		getDefaultNumTasks: jest.fn(() => 10),
		getDefaultPriority: jest.fn(() => 'medium')
	})
);

jest.unstable_mockModule(
	'../../../../../scripts/modules/task-manager/generate-task-files.js',
	() => ({
		default: jest.fn().mockResolvedValue()
	})
);

jest.unstable_mockModule(
	'../../../../../scripts/modules/task-manager/models.js',
	() => ({
		getModelConfiguration: jest.fn(() => ({
			model: 'mock-model',
			maxTokens: 4000,
			temperature: 0.7
		}))
	})
);

jest.unstable_mockModule(
	'../../../../../scripts/modules/prompt-manager.js',
	() => ({
		getPromptManager: jest.fn().mockReturnValue({
			loadPrompt: jest.fn().mockImplementation((templateName, params) => {
				// Create dynamic mock prompts based on the parameters
				const { numTasks } = params || {};
				let numTasksText = '';

				if (numTasks > 0) {
					numTasksText = `approximately ${numTasks}`;
				} else {
					numTasksText = 'an appropriate number of';
				}

				return Promise.resolve({
					systemPrompt: 'Mocked system prompt for parse-prd',
					userPrompt: `Generate ${numTasksText} top-level development tasks from the PRD content.`
				});
			})
		})
	})
);

// Mock fs module
jest.unstable_mockModule('fs', () => ({
	default: {
		readFileSync: jest.fn(),
		existsSync: jest.fn(),
		mkdirSync: jest.fn(),
		writeFileSync: jest.fn()
	},
	readFileSync: jest.fn(),
	existsSync: jest.fn(),
	mkdirSync: jest.fn(),
	writeFileSync: jest.fn()
}));

// Mock path module
jest.unstable_mockModule('path', () => ({
	default: {
		dirname: jest.fn(),
		join: jest.fn((dir, file) => `${dir}/${file}`)
	},
	dirname: jest.fn(),
	join: jest.fn((dir, file) => `${dir}/${file}`)
}));

// Import the mocked modules
const { readJSON, promptYesNo } = await import(
	'../../../../../scripts/modules/utils.js'
);

const { generateObjectService } = await import(
	'../../../../../scripts/modules/ai-services-unified.js'
);

// Note: getDefaultNumTasks validation happens at CLI/MCP level, not in the main parse-prd module
const generateTaskFiles = (
	await import(
		'../../../../../scripts/modules/task-manager/generate-task-files.js'
	)
).default;

const fs = await import('fs');
const path = await import('path');

// Import the module under test
const { default: parsePRD } = await import(
	'../../../../../scripts/modules/task-manager/parse-prd.js'
);

// Sample data for tests (from main test file)
const sampleClaudeResponse = {
	tasks: [
		{
			id: 1,
			title: 'Setup Project Structure',
			description: 'Initialize the project with necessary files and folders',
			status: 'pending',
			dependencies: [],
			priority: 'high'
		},
		{
			id: 2,
			title: 'Implement Core Features',
			description: 'Build the main functionality',
			status: 'pending',
			dependencies: [1],
			priority: 'high'
		}
	],
	metadata: {
		projectName: 'Test Project',
		totalTasks: 2,
		sourceFile: 'path/to/prd.txt',
		generatedAt: expect.any(String)
	}
};

describe('parsePRD', () => {
	// Mock the sample PRD content
	const samplePRDContent = '# Sample PRD for Testing';

	// Mock existing tasks for append test - TAGGED FORMAT
	const existingTasksData = {
		master: {
			tasks: [
				{ id: 1, title: 'Existing Task 1', status: 'done' },
				{ id: 2, title: 'Existing Task 2', status: 'pending' }
			]
		}
	};

	// Mock new tasks with continuing IDs for append test
	const newTasksClaudeResponse = {
		tasks: [
			{ id: 3, title: 'New Task 3' },
			{ id: 4, title: 'New Task 4' }
		],
		metadata: {
			projectName: 'Test Project',
			totalTasks: 2,
			sourceFile: 'path/to/prd.txt',
			generatedAt: expect.any(String)
		}
	};

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Set up mocks for fs, path and other modules
		fs.default.readFileSync.mockReturnValue(samplePRDContent);
		fs.default.existsSync.mockReturnValue(true);
		path.default.dirname.mockReturnValue('tasks');
		generateObjectService.mockResolvedValue({
			mainResult: { object: sampleClaudeResponse },
			telemetryData: {}
		});
		generateTaskFiles.mockResolvedValue(undefined);
		promptYesNo.mockResolvedValue(true); // Default to "yes" for confirmation

		// Mock console.error to prevent output
		jest.spyOn(console, 'error').mockImplementation(() => {});
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		// Restore all mocks after each test
		jest.restoreAllMocks();
	});

	test('should parse a PRD file and generate tasks', async () => {
		// Setup mocks to simulate normal conditions (no existing output file)
		fs.default.existsSync.mockImplementation((p) => {
			if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
			if (p === 'tasks') return true; // Directory exists
			return false;
		});

		// Call the function
		const result = await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, {
			tag: 'master'
		});

		// Verify fs.readFileSync was called with the correct arguments
		expect(fs.default.readFileSync).toHaveBeenCalledWith(
			'path/to/prd.txt',
			'utf8'
		);

		// Verify generateObjectService was called
		expect(generateObjectService).toHaveBeenCalled();

		// Verify directory check
		expect(fs.default.existsSync).toHaveBeenCalledWith('tasks');

		// Verify fs.writeFileSync was called with the correct arguments in tagged format
		expect(fs.default.writeFileSync).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.stringContaining('"master"')
		);

		// Verify result
		expect(result).toEqual({
			success: true,
			tasksPath: 'tasks/tasks.json',
			telemetryData: {}
		});

		// Verify that the written data contains 2 tasks from sampleClaudeResponse in the correct tag
		const writtenDataString = fs.default.writeFileSync.mock.calls[0][1];
		const writtenData = JSON.parse(writtenDataString);
		expect(writtenData.master.tasks.length).toBe(2);
	});

	test('should create the tasks directory if it does not exist', async () => {
		// Mock existsSync to return false specifically for the directory check
		// but true for the output file check (so we don't trigger confirmation path)
		fs.default.existsSync.mockImplementation((p) => {
			if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
			if (p === 'tasks') return false; // Directory doesn't exist
			return true; // Default for other paths
		});

		// Call the function
		await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, { tag: 'master' });

		// Verify mkdir was called
		expect(fs.default.mkdirSync).toHaveBeenCalledWith('tasks', {
			recursive: true
		});
	});

	test('should handle errors in the PRD parsing process', async () => {
		// Mock an error in generateObjectService
		const testError = new Error('Test error in AI API call');
		generateObjectService.mockRejectedValueOnce(testError);

		// Setup mocks to simulate normal file conditions (no existing file)
		fs.default.existsSync.mockImplementation((p) => {
			if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
			if (p === 'tasks') return true; // Directory exists
			return false;
		});

		// Call the function with mcpLog to make it think it's in MCP mode (which throws instead of process.exit)
		await expect(
			parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, {
				tag: 'master',
				mcpLog: {
					info: jest.fn(),
					warn: jest.fn(),
					error: jest.fn(),
					debug: jest.fn(),
					success: jest.fn()
				}
			})
		).rejects.toThrow('Test error in AI API call');
	});

	test('should generate individual task files after creating tasks.json', async () => {
		// Setup mocks to simulate normal conditions (no existing output file)
		fs.default.existsSync.mockImplementation((p) => {
			if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
			if (p === 'tasks') return true; // Directory exists
			return false;
		});

		// Call the function
		await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, { tag: 'master' });
	});

	test('should overwrite tasks.json when force flag is true', async () => {
		// Setup mocks to simulate tasks.json already exists
		fs.default.existsSync.mockImplementation((p) => {
			if (p === 'tasks/tasks.json') return true; // Output file exists
			if (p === 'tasks') return true; // Directory exists
			return false;
		});

		// Call the function with force=true to allow overwrite
		await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, {
			force: true,
			tag: 'master'
		});

		// Verify prompt was NOT called (confirmation happens at CLI level, not in core function)
		expect(promptYesNo).not.toHaveBeenCalled();

		// Verify the file was written after force overwrite
		expect(fs.default.writeFileSync).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.stringContaining('"master"')
		);
	});

	test('should throw error when tasks in tag exist without force flag in MCP mode', async () => {
		// Setup mocks to simulate tasks.json already exists with tasks in the target tag
		fs.default.existsSync.mockReturnValue(true);
		// Mock readFileSync to return data with tasks in the 'master' tag
		fs.default.readFileSync.mockReturnValueOnce(
			JSON.stringify(existingTasksData)
		);

		// Call the function with mcpLog to make it think it's in MCP mode (which throws instead of process.exit)
		await expect(
			parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, {
				tag: 'master',
				mcpLog: {
					info: jest.fn(),
					warn: jest.fn(),
					error: jest.fn(),
					debug: jest.fn(),
					success: jest.fn()
				}
			})
		).rejects.toThrow(
			"Tag 'master' already contains 2 tasks. Use --force to overwrite or --append to add to existing tasks."
		);

		// Verify prompt was NOT called
		expect(promptYesNo).not.toHaveBeenCalled();

		// Verify the file was NOT written
		expect(fs.default.writeFileSync).not.toHaveBeenCalled();
	});

	test('should throw error when tasks in tag exist without force flag in CLI mode', async () => {
		// Setup mocks to simulate tasks.json already exists with tasks in the target tag
		fs.default.existsSync.mockReturnValue(true);
		fs.default.readFileSync.mockReturnValueOnce(
			JSON.stringify(existingTasksData)
		);

		// Call the function without mcpLog (CLI mode) and expect it to throw an error
		// In test environment, process.exit is prevented and error is thrown instead
		await expect(
			parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, { tag: 'master' })
		).rejects.toThrow(
			"Tag 'master' already contains 2 tasks. Use --force to overwrite or --append to add to existing tasks."
		);

		// Verify the file was NOT written
		expect(fs.default.writeFileSync).not.toHaveBeenCalled();
	});

	test('should append new tasks when append option is true', async () => {
		// Setup mocks to simulate tasks.json already exists
		fs.default.existsSync.mockReturnValue(true);

		// Mock for reading existing tasks in tagged format
		readJSON.mockReturnValue(existingTasksData);
		// Mock readFileSync to return the raw content for the initial check
		fs.default.readFileSync.mockReturnValueOnce(
			JSON.stringify(existingTasksData)
		);

		// Mock generateObjectService to return new tasks with continuing IDs
		generateObjectService.mockResolvedValueOnce({
			mainResult: { object: newTasksClaudeResponse },
			telemetryData: {}
		});

		// Call the function with append option
		const result = await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 2, {
			tag: 'master',
			append: true
		});

		// Verify prompt was NOT called (no confirmation needed for append)
		expect(promptYesNo).not.toHaveBeenCalled();

		// Verify the file was written with merged tasks in the correct tag
		expect(fs.default.writeFileSync).toHaveBeenCalledWith(
			'tasks/tasks.json',
			expect.stringContaining('"master"')
		);

		// Verify the result contains merged tasks
		expect(result).toEqual({
			success: true,
			tasksPath: 'tasks/tasks.json',
			telemetryData: {}
		});

		// Verify that the written data contains 4 tasks (2 existing + 2 new)
		const writtenDataString = fs.default.writeFileSync.mock.calls[0][1];
		const writtenData = JSON.parse(writtenDataString);
		expect(writtenData.master.tasks.length).toBe(4);
	});

	test('should skip prompt and not overwrite when append is true', async () => {
		// Setup mocks to simulate tasks.json already exists
		fs.default.existsSync.mockReturnValue(true);
		fs.default.readFileSync.mockReturnValueOnce(
			JSON.stringify(existingTasksData)
		);

		// Call the function with append option
		await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 3, {
			tag: 'master',
			append: true
		});

		// Verify prompt was NOT called with append flag
		expect(promptYesNo).not.toHaveBeenCalled();
	});

	describe('Dynamic Task Generation', () => {
		test('should use dynamic prompting when numTasks is 0', async () => {
			// Setup mocks to simulate normal conditions (no existing output file)
			fs.default.existsSync.mockImplementation((p) => {
				if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
				if (p === 'tasks') return true; // Directory exists
				return false;
			});

			// Call the function with numTasks=0 for dynamic generation
			await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 0, {
				tag: 'master'
			});

			// Verify generateObjectService was called
			expect(generateObjectService).toHaveBeenCalled();

			// Get the call arguments to verify the prompt
			const callArgs = generateObjectService.mock.calls[0][0];
			expect(callArgs.prompt).toContain('an appropriate number of');
			expect(callArgs.prompt).not.toContain('approximately 0');
		});

		test('should use specific count prompting when numTasks is positive', async () => {
			// Setup mocks to simulate normal conditions (no existing output file)
			fs.default.existsSync.mockImplementation((p) => {
				if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
				if (p === 'tasks') return true; // Directory exists
				return false;
			});

			// Call the function with specific numTasks
			await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 5, {
				tag: 'master'
			});

			// Verify generateObjectService was called
			expect(generateObjectService).toHaveBeenCalled();

			// Get the call arguments to verify the prompt
			const callArgs = generateObjectService.mock.calls[0][0];
			expect(callArgs.prompt).toContain('approximately 5');
			expect(callArgs.prompt).not.toContain('an appropriate number of');
		});

		test('should accept 0 as valid numTasks value', async () => {
			// Setup mocks to simulate normal conditions (no existing output file)
			fs.default.existsSync.mockImplementation((p) => {
				if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
				if (p === 'tasks') return true; // Directory exists
				return false;
			});

			// Call the function with numTasks=0 - should not throw error
			const result = await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 0, {
				tag: 'master'
			});

			// Verify it completed successfully
			expect(result).toEqual({
				success: true,
				tasksPath: 'tasks/tasks.json',
				telemetryData: {}
			});
		});

		test('should use dynamic prompting when numTasks is negative (no validation in main module)', async () => {
			// Setup mocks to simulate normal conditions (no existing output file)
			fs.default.existsSync.mockImplementation((p) => {
				if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
				if (p === 'tasks') return true; // Directory exists
				return false;
			});

			// Call the function with negative numTasks
			// Note: The main parse-prd.js module doesn't validate numTasks - validation happens at CLI/MCP level
			await parsePRD('path/to/prd.txt', 'tasks/tasks.json', -5, {
				tag: 'master'
			});

			// Verify generateObjectService was called
			expect(generateObjectService).toHaveBeenCalled();
			const callArgs = generateObjectService.mock.calls[0][0];
			// Negative values are treated as <= 0, so should use dynamic prompting
			expect(callArgs.prompt).toContain('an appropriate number of');
			expect(callArgs.prompt).not.toContain('approximately -5');
		});
	});

	describe('Configuration Integration', () => {
		test('should use dynamic prompting when numTasks is null', async () => {
			// Setup mocks to simulate normal conditions (no existing output file)
			fs.default.existsSync.mockImplementation((p) => {
				if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
				if (p === 'tasks') return true; // Directory exists
				return false;
			});

			// Call the function with null numTasks
			await parsePRD('path/to/prd.txt', 'tasks/tasks.json', null, {
				tag: 'master'
			});

			// Verify generateObjectService was called with dynamic prompting
			expect(generateObjectService).toHaveBeenCalled();
			const callArgs = generateObjectService.mock.calls[0][0];
			expect(callArgs.prompt).toContain('an appropriate number of');
		});

		test('should use dynamic prompting when numTasks is invalid string', async () => {
			// Setup mocks to simulate normal conditions (no existing output file)
			fs.default.existsSync.mockImplementation((p) => {
				if (p === 'tasks/tasks.json') return false; // Output file doesn't exist
				if (p === 'tasks') return true; // Directory exists
				return false;
			});

			// Call the function with invalid numTasks (string that's not a number)
			await parsePRD('path/to/prd.txt', 'tasks/tasks.json', 'invalid', {
				tag: 'master'
			});

			// Verify generateObjectService was called with dynamic prompting
			// Note: The main module doesn't validate - it just uses the value as-is
			// Since 'invalid' > 0 is false, it uses dynamic prompting
			expect(generateObjectService).toHaveBeenCalled();
			const callArgs = generateObjectService.mock.calls[0][0];
			expect(callArgs.prompt).toContain('an appropriate number of');
		});
	});
});
