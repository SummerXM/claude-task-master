# Configuration

Taskmaster uses two primary methods for configuration:

1.  **`.taskmaster/config.json` File (Recommended - New Structure)**

    - This JSON file stores most configuration settings, including AI model selections, parameters, logging levels, and project defaults.
    - **Location:** This file is created in the `.taskmaster/` directory when you run the `task-master models --setup` interactive setup or initialize a new project with `task-master init`.
    - **Migration:** Existing projects with `.taskmasterconfig` in the root will continue to work, but should be migrated to the new structure using `task-master migrate`.
    - **Management:** Use the `task-master models --setup` command (or `models` MCP tool) to interactively create and manage this file. You can also set specific models directly using `task-master models --set-<role>=<model_id>`, adding `--ollama` or `--openrouter` flags for custom models. Manual editing is possible but not recommended unless you understand the structure.
    - **Example Structure:**
      ```json
      {
        "models": {
          "main": {
            "provider": "anthropic",
            "modelId": "claude-3-7-sonnet-20250219",
            "maxTokens": 64000,
            "temperature": 0.2,
            "baseURL": "https://api.anthropic.com/v1"
          },
          "research": {
            "provider": "perplexity",
            "modelId": "sonar-pro",
            "maxTokens": 8700,
            "temperature": 0.1,
            "baseURL": "https://api.perplexity.ai/v1"
          },
          "fallback": {
            "provider": "anthropic",
            "modelId": "claude-3-5-sonnet",
            "maxTokens": 64000,
            "temperature": 0.2
          }
        },
        "global": {
          "logLevel": "info",
          "debug": false,
          "defaultNumTasks": 10,
          "defaultSubtasks": 5,
          "defaultPriority": "medium",
          "defaultTag": "master",
          "projectName": "Your Project Name",
          "ollamaBaseURL": "http://localhost:11434/api",
          "azureBaseURL": "https://your-endpoint.azure.com/openai/deployments",
          "vertexProjectId": "your-gcp-project-id",
          "vertexLocation": "us-central1",
	      "responseLanguage": "English"
        }
      }
      ```

> For MCP-specific setup and troubleshooting, see [Provider-Specific Configuration](#provider-specific-configuration).

2.  **Legacy `.taskmasterconfig` File (Backward Compatibility)**

    - For projects that haven't migrated to the new structure yet.
    - **Location:** Project root directory.
    - **Migration:** Use `task-master migrate` to move this to `.taskmaster/config.json`.
    - **Deprecation:** While still supported, you'll see warnings encouraging migration to the new structure.

## Environment Variables (`.env` file or MCP `env` block - For API Keys Only)

- Used **exclusively** for sensitive API keys and specific endpoint URLs.
- **Location:**
  - For CLI usage: Create a `.env` file in your project root.
  - For MCP/Cursor usage: Configure keys in the `env` section of your `.cursor/mcp.json` file.
- **Required API Keys (Depending on configured providers):**
  - `ANTHROPIC_API_KEY`: Your Anthropic API key.
  - `PERPLEXITY_API_KEY`: Your Perplexity API key.
  - `OPENAI_API_KEY`: Your OpenAI API key.
  - `GOOGLE_API_KEY`: Your Google API key (also used for Vertex AI provider).
  - `MISTRAL_API_KEY`: Your Mistral API key.
  - `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key (also requires `AZURE_OPENAI_ENDPOINT`).
  - `OPENROUTER_API_KEY`: Your OpenRouter API key.
  - `XAI_API_KEY`: Your X-AI API key.
- **Optional Endpoint Overrides:**
  - **Per-role `baseURL` in `.taskmasterconfig`:** You can add a `baseURL` property to any model role (`main`, `research`, `fallback`) to override the default API endpoint for that provider. If omitted, the provider's standard endpoint is used.
  - **Environment Variable Overrides (`<PROVIDER>_BASE_URL`):** For greater flexibility, especially with third-party services, you can set an environment variable like `OPENAI_BASE_URL` or `MISTRAL_BASE_URL`. This will override any `baseURL` set in the configuration file for that provider. This is the recommended way to connect to OpenAI-compatible APIs.
  - `AZURE_OPENAI_ENDPOINT`: Required if using Azure OpenAI key (can also be set as `baseURL` for the Azure model role).
  - `OLLAMA_BASE_URL`: Override the default Ollama API URL (Default: `http://localhost:11434/api`).
  - `VERTEX_PROJECT_ID`: Your Google Cloud project ID for Vertex AI. Required when using the 'vertex' provider.
  - `VERTEX_LOCATION`: Google Cloud region for Vertex AI (e.g., 'us-central1'). Default is 'us-central1'.
  - `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account credentials JSON file for Google Cloud auth (alternative to API key for Vertex AI).

**Important:** Settings like model ID selections (`main`, `research`, `fallback`), `maxTokens`, `temperature`, `logLevel`, `defaultSubtasks`, `defaultPriority`, and `projectName` are **managed in `.taskmaster/config.json`** (or `.taskmasterconfig` for unmigrated projects), not environment variables.

## Tagged Task Lists Configuration (v0.17+)

Taskmaster includes a tagged task lists system for multi-context task management.

### Global Tag Settings

```json
"global": {
  "defaultTag": "master"
}
```

- **`defaultTag`** (string): Default tag context for new operations (default: "master")

### Git Integration

Task Master provides manual git integration through the `--from-branch` option:

- **Manual Tag Creation**: Use `task-master add-tag --from-branch` to create a tag based on your current git branch name
- **User Control**: No automatic tag switching - you control when and how tags are created
- **Flexible Workflow**: Supports any git workflow without imposing rigid branch-tag mappings

## State Management File

Taskmaster uses `.taskmaster/state.json` to track tagged system runtime information:

```json
{
  "currentTag": "master",
  "lastSwitched": "2025-06-11T20:26:12.598Z",
  "migrationNoticeShown": true
}
```

- **`currentTag`**: Currently active tag context
- **`lastSwitched`**: Timestamp of last tag switch
- **`migrationNoticeShown`**: Whether migration notice has been displayed

This file is automatically created during tagged system migration and should not be manually edited.

## Example `.env` File (for API Keys)

```
# Required API keys for providers configured in .taskmaster/config.json
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
PERPLEXITY_API_KEY=pplx-your-key-here
# OPENAI_API_KEY=sk-your-key-here
# GOOGLE_API_KEY=AIzaSy...
# AZURE_OPENAI_API_KEY=your-azure-openai-api-key-here
# etc.

# Optional Endpoint Overrides
# Use a specific provider's base URL, e.g., for an OpenAI-compatible API
# OPENAI_BASE_URL=https://api.third-party.com/v1
#
# Azure OpenAI Configuration
# AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/ or https://your-endpoint-name.cognitiveservices.azure.com/openai/deployments
# OLLAMA_BASE_URL=http://custom-ollama-host:11434/api

# Google Vertex AI Configuration (Required if using 'vertex' provider)
# VERTEX_PROJECT_ID=your-gcp-project-id
```

## Troubleshooting

### Configuration Errors

- If Task Master reports errors about missing configuration or cannot find the config file, run `task-master models --setup` in your project root to create or repair the file.
- For new projects, config will be created at `.taskmaster/config.json`. For legacy projects, you may want to use `task-master migrate` to move to the new structure.
- Ensure API keys are correctly placed in your `.env` file (for CLI) or `.cursor/mcp.json` (for MCP) and are valid for the providers selected in your config file.

### If `task-master init` doesn't respond:

Try running it with Node directly:

```bash
node node_modules/claude-task-master/scripts/init.js
```

Or clone the repository and run:

```bash
git clone https://github.com/eyaltoledano/claude-task-master.git
cd claude-task-master
node scripts/init.js
```

## Provider-Specific Configuration

### MCP (Model Context Protocol) Provider

1. **Prerequisites**:
   - An active MCP session with sampling capability
   - MCP client with sampling support (e.g. VS Code)
   - No API keys required (uses session-based authentication)

2. **Configuration**:
   ```json
   {
     "models": {
       "main": {
         "provider": "mcp",
         "modelId": "mcp-sampling"
       },
       "research": {
         "provider": "mcp",
         "modelId": "mcp-sampling"
       }
     }
   }
   ```

3. **Available Model IDs**:
   - `mcp-sampling` - General text generation using MCP client sampling (supports all roles)
   - `claude-3-5-sonnet-20241022` - High-performance model for general tasks (supports all roles)
   - `claude-3-opus-20240229` - Enhanced reasoning model for complex tasks (supports all roles)

4. **Features**:
   - ✅ **Text Generation**: Standard AI text generation via MCP sampling
   - ✅ **Object Generation**: Full schema-driven structured output generation
   - ✅ **PRD Parsing**: Parse Product Requirements Documents into structured tasks
   - ✅ **Task Creation**: AI-powered task creation with validation
   - ✅ **Session Management**: Automatic session detection and context handling
   - ✅ **Error Recovery**: Robust error handling and fallback mechanisms

5. **Usage Requirements**:
   - Must be running in an MCP context (session must be available)
   - Session must provide `clientCapabilities.sampling` capability

6. **Best Practices**:
   - Always configure a non-MCP fallback provider
   - Use `mcp` for main/research roles when in MCP environments
   - Test sampling capability before production use

7. **Setup Commands**:
   ```bash
   # Set MCP provider for main role
   task-master models set-main --provider mcp --model claude-3-5-sonnet-20241022
   
   # Set MCP provider for research role  
   task-master models set-research --provider mcp --model claude-3-opus-20240229
   
   # Verify configuration
   task-master models list
   ```

8. **Troubleshooting**:
   - "MCP provider requires session context" → Ensure running in MCP environment
   - See the [MCP Provider Guide](./mcp-provider-guide.md) for detailed troubleshooting

### Google Vertex AI Configuration

Google Vertex AI is Google Cloud's enterprise AI platform and requires specific configuration:

1. **Prerequisites**:
   - A Google Cloud account with Vertex AI API enabled
   - Either a Google API key with Vertex AI permissions OR a service account with appropriate roles
   - A Google Cloud project ID
2. **Authentication Options**:
   - **API Key**: Set the `GOOGLE_API_KEY` environment variable
   - **Service Account**: Set `GOOGLE_APPLICATION_CREDENTIALS` to point to your service account JSON file
3. **Required Configuration**:
   - Set `VERTEX_PROJECT_ID` to your Google Cloud project ID
   - Set `VERTEX_LOCATION` to your preferred Google Cloud region (default: us-central1)
4. **Example Setup**:

   ```bash
   # In .env file
   GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
   VERTEX_PROJECT_ID=my-gcp-project-123
   VERTEX_LOCATION=us-central1
   ```

   Or using service account:

   ```bash
   # In .env file
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   VERTEX_PROJECT_ID=my-gcp-project-123
   VERTEX_LOCATION=us-central1
   ```

5. **In .taskmaster/config.json**:
   ```json
   "global": {
     "vertexProjectId": "my-gcp-project-123",
     "vertexLocation": "us-central1"
   }
   ```

### Azure OpenAI Configuration

Azure OpenAI provides enterprise-grade OpenAI models through Microsoft's Azure cloud platform and requires specific configuration:

1. **Prerequisites**:
   - An Azure account with an active subscription
   - Azure OpenAI service resource created in the Azure portal
   - Azure OpenAI API key and endpoint URL
   - Deployed models (e.g., gpt-4o, gpt-4o-mini, gpt-4.1, etc) in your Azure OpenAI resource

2. **Authentication**:
   - Set the `AZURE_OPENAI_API_KEY` environment variable with your Azure OpenAI API key
   - Configure the endpoint URL using one of the methods below

3. **Configuration Options**:

   **Option 1: Using Global Azure Base URL (affects all Azure models)**
   ```json
   // In .taskmaster/config.json
   {
     "models": {
       "main": {
         "provider": "azure",
         "modelId": "gpt-4o",
         "maxTokens": 16000,
         "temperature": 0.7
       },
       "fallback": {
         "provider": "azure", 
         "modelId": "gpt-4o-mini",
         "maxTokens": 10000,
         "temperature": 0.7
       }
     },
     "global": {
       "azureBaseURL": "https://your-resource-name.azure.com/openai/deployments"
     }
   }
   ```

   **Option 2: Using Per-Model Base URLs (recommended for flexibility)**
   ```json
   // In .taskmaster/config.json
   {
     "models": {
       "main": {
         "provider": "azure",
         "modelId": "gpt-4o", 
         "maxTokens": 16000,
         "temperature": 0.7,
         "baseURL": "https://your-resource-name.azure.com/openai/deployments"
       },
       "research": {
         "provider": "perplexity",
         "modelId": "sonar-pro",
         "maxTokens": 8700,
         "temperature": 0.1
       },
       "fallback": {
         "provider": "azure",
         "modelId": "gpt-4o-mini",
         "maxTokens": 10000, 
         "temperature": 0.7,
         "baseURL": "https://your-resource-name.azure.com/openai/deployments"
       }
     }
   }
   ```

4. **Environment Variables**:
   ```bash
   # In .env file
   AZURE_OPENAI_API_KEY=your-azure-openai-api-key-here
   
   # Optional: Override endpoint for all Azure models
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.azure.com/openai/deployments
   ```

5. **Important Notes**:
   - **Model Deployment Names**: The `modelId` in your configuration should match the **deployment name** you created in Azure OpenAI Studio, not the underlying model name
   - **Base URL Priority**: Per-model `baseURL` settings override the global `azureBaseURL` setting
   - **Endpoint Format**: When using per-model `baseURL`, use the full path including `/openai/deployments`

6. **Troubleshooting**:

   **"Resource not found" errors:**
   - Ensure your `baseURL` includes the full path: `https://your-resource-name.openai.azure.com/openai/deployments`
   - Verify that your deployment name in `modelId` exactly matches what's configured in Azure OpenAI Studio
   - Check that your Azure OpenAI resource is in the correct region and properly deployed

   **Authentication errors:**
   - Verify your `AZURE_OPENAI_API_KEY` is correct and has not expired
   - Ensure your Azure OpenAI resource has the necessary permissions
   - Check that your subscription has not been suspended or reached quota limits

   **Model availability errors:**
   - Confirm the model is deployed in your Azure OpenAI resource
   - Verify the deployment name matches your configuration exactly (case-sensitive)
   - Ensure the model deployment is in a "Succeeded" state in Azure OpenAI Studio
   - Ensure youre not getting rate limited by `maxTokens` maintain appropriate Tokens per Minute Rate Limit (TPM) in your deployment.
